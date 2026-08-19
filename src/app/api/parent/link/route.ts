/**
 * Links a parent's anonymous session to their child, and unlinks it on sign-out.
 *
 * This is a server route because the browser cannot be trusted with either half
 * of the decision.
 *
 * **Which child.** Access used to be granted by the portal writing its own uid
 * into `clients/{id}.parentUids`, permitted by a Firestore rule that asked only
 * that the caller be signed in. Anonymous sign-in is open, and 52 of this
 * clinic's 88 client documents have human-chosen ids of the form `firstname` plus
 * a four-digit birthday. Anyone could guess `adelina2511`, add themselves, and
 * read that child's record, evaluations, videos and voice notes. The route
 * resolves the child from the **access code** instead, server-side, and ignores
 * any client id the caller supplies.
 *
 * **Which bucket.** Storage rules can only read the `(default)` database, so a
 * parent's tenancy is mirrored there as `tenant_parents/{bucket}__{uid}`. The
 * bucket is in the key, and it comes from the Host header — never from the body,
 * or an anonymous visitor could claim another clinic's bucket.
 *
 * Anonymous uids are per-device and per-session, so this runs on every portal
 * login rather than once at signup.
 */
import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { tenantDatabaseFromRequest, resolveStorageBucket, DEFAULT_DATABASE_ID } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The uid of the caller, from a verified ID token. Anonymous users are expected. */
async function callerUid(req: NextRequest): Promise<string | null> {
  const authz = req.headers.get("authorization") || "";
  const token = authz.startsWith("Bearer ") ? authz.slice(7).trim() : "";
  if (!token) return null;
  try {
    return (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    return null;
  }
}

function tenantOf(req: NextRequest) {
  const databaseId = tenantDatabaseFromRequest(req);
  return {
    databaseId,
    tenantId: databaseId === DEFAULT_DATABASE_ID ? "default" : databaseId.slice("clinic-".length),
    bucket: resolveStorageBucket(
      req.headers.get("host") || "",
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
    ),
  };
}

/**
 * Rewrites the Storage mirror from the clinic's own records — never from the
 * request. A caller who is no longer a parent of anything has theirs removed.
 */
async function syncMirror(databaseId: string, tenantId: string, bucket: string, uid: string) {
  const snap = await adminDb(databaseId)
    .collection("clients")
    .where("parentUids", "array-contains", uid)
    .get();
  const clientIds = snap.docs.map((d) => d.id);

  const mirror = adminDb().collection("tenant_parents").doc(`${bucket}__${uid}`);
  if (!clientIds.length) {
    await mirror.delete().catch(() => {});
    return clientIds;
  }
  await mirror.set({ tenantId, clientIds, updatedAt: new Date().toISOString() });
  return clientIds;
}

export async function POST(req: NextRequest) {
  const uid = await callerUid(req);
  if (!uid) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const { databaseId, tenantId, bucket } = tenantOf(req);
  if (!bucket) return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });

  let body: { code?: string; previousUid?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const code = String(body.code || "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  try {
    const db = adminDb(databaseId);

    // The authorisation step: the code is the credential, and it is checked here
    // rather than being taken on trust from whatever the browser resolved.
    const codeSnap = await db.collection("client_codes").doc(code).get();
    if (!codeSnap.exists) return NextResponse.json({ error: "invalid_code" }, { status: 404 });

    const { clientId, clientName } = (codeSnap.data() || {}) as {
      clientId?: string;
      clientName?: string;
    };
    if (!clientId) return NextResponse.json({ error: "invalid_code" }, { status: 404 });

    const clientRef = db.collection("clients").doc(clientId);
    if (!(await clientRef.get()).exists) {
      return NextResponse.json({ error: "invalid_code" }, { status: 404 });
    }

    await clientRef.update({ parentUids: FieldValue.arrayUnion(uid) });

    // Drop the uid this device used before, so a parent's entry does not
    // accumulate one dead grant per session. Safe to honour: the caller has
    // already proved knowledge of this child's access code, which grants at
    // least as much as removing a stale uid from the same child.
    const previousUid = String(body.previousUid || "").trim();
    if (previousUid && previousUid !== uid) {
      await clientRef.update({ parentUids: FieldValue.arrayRemove(previousUid) }).catch(() => {});
    }

    const clientIds = await syncMirror(databaseId, tenantId, bucket, uid);
    return NextResponse.json({ clientId, clientName: clientName || "", clientIds });
  } catch (e: any) {
    console.error("[parent/link] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** Sign-out: drop this uid from every client it was linked to, and its mirror. */
export async function DELETE(req: NextRequest) {
  const uid = await callerUid(req);
  if (!uid) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const { databaseId, tenantId, bucket } = tenantOf(req);
  try {
    const db = adminDb(databaseId);
    const snap = await db.collection("clients").where("parentUids", "array-contains", uid).get();
    await Promise.all(
      snap.docs.map((d) => d.ref.update({ parentUids: FieldValue.arrayRemove(uid) }).catch(() => {})),
    );
    await syncMirror(databaseId, tenantId, bucket, uid);
    return NextResponse.json({ unlinked: snap.size });
  } catch (e: any) {
    console.error("[parent/link] unlink failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
