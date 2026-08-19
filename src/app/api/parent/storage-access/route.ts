/**
 * Grants (and revokes) a parent's access to their clinic's Storage bucket.
 *
 * Why a server route rather than a client write: Storage rules can only read the
 * `(default)` Firestore database, so a parent's tenancy has to be mirrored there
 * as `tenant_parents/{bucket}__{uid}`. The **bucket is in the key**, and which
 * bucket a parent belongs to is an authorisation decision — if the browser
 * supplied it, any anonymous visitor could claim another clinic's bucket and
 * start guessing client ids against it.
 *
 * So nothing here is taken from the request body. The tenant comes from the Host
 * header, and the client list comes from querying the clinic's own database for
 * documents that already list this uid in `parentUids`. A caller who is not a
 * parent of anything gets their mirror deleted, not created.
 *
 * Parents authenticate anonymously, so their uid changes per device and per
 * cleared session. The mirror is therefore written on every successful portal
 * login, not once at signup.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { tenantDatabaseFromRequest, resolveStorageBucket, DEFAULT_DATABASE_ID } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The uid of the caller, from a verified ID token. Anonymous users are fine. */
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
  const host = req.headers.get("host") || "";
  return {
    databaseId,
    tenantId: databaseId === DEFAULT_DATABASE_ID ? "default" : databaseId.slice("clinic-".length),
    bucket: resolveStorageBucket(host, process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""),
  };
}

export async function POST(req: NextRequest) {
  const uid = await callerUid(req);
  if (!uid) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const { databaseId, tenantId, bucket } = tenantOf(req);
  if (!bucket) return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });

  try {
    // The authorisation check: which of THIS clinic's clients already name this
    // uid as a parent. Anything the caller sent is ignored.
    const snap = await adminDb(databaseId)
      .collection("clients")
      .where("parentUids", "array-contains", uid)
      .get();
    const clientIds = snap.docs.map((d) => d.id);

    // Keyed by bucket AND uid, so a parent with children at two clinics keeps
    // access to both instead of the second login revoking the first.
    const mirror = adminDb().collection("tenant_parents").doc(`${bucket}__${uid}`);
    if (!clientIds.length) {
      // Not a parent here any more — leave nothing behind that grants access.
      await mirror.delete().catch(() => {});
      return NextResponse.json({ granted: false, clientIds: [] });
    }

    await mirror.set({ tenantId, clientIds, updatedAt: new Date().toISOString() });
    return NextResponse.json({ granted: true, bucket, clientIds });
  } catch (e: any) {
    console.error("[parent/storage-access] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** Called on portal sign-out, so a shared device leaves no usable mirror behind. */
export async function DELETE(req: NextRequest) {
  const uid = await callerUid(req);
  if (!uid) return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  const { bucket } = tenantOf(req);
  try {
    // Only this clinic's mirror — a sign-out here must not revoke a sibling clinic.
    await adminDb().collection("tenant_parents").doc(`${bucket}__${uid}`).delete();
    return NextResponse.json({ revoked: true });
  } catch (e: any) {
    console.error("[parent/storage-access] revoke failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
