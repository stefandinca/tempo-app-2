/**
 * A clinic's logo, uploaded into that clinic's OWN Storage bucket.
 *
 * The bucket is the tenant — `storage.rules` authorises by comparing the bucket
 * name against the caller's membership mirror — so writing to the wrong bucket
 * is a cross-tenant write, not a cosmetic mistake. The bucket name comes from
 * the registry, never from the request.
 *
 * `system_settings/branding` is world-readable by design: the logo renders on
 * the login and password-reset screens, before anyone has signed in. It holds a
 * URL to an image that is public by nature and nothing else.
 */
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import { tenantIdentity } from "@/lib/platform/counts";
import { logPlatformActivity } from "@/lib/platform/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2 * 1024 * 1024;

async function registryFor(id: string) {
  const snap = await adminDb().collection("tenants").doc(id).get();
  if (!snap.exists) return null;
  // One source for the databaseId derivation, shared with every other
  // platform route, rather than reimplementing the `clinic-${id}` fallback
  // here and risking the two disagreeing.
  const identity = tenantIdentity(snap);
  if (!identity) return null;
  const t = snap.data() as { name?: string; bucket?: string };
  return {
    name: t.name || id,
    databaseId: identity.databaseId,
    bucket: t.bucket || "",
  };
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);
  if (!clinicDatabaseId(params.id)) {
    return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    file = f instanceof File ? f : null;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  // The same limits storage.rules enforces. Checked here too, because this
  // route uses the Admin SDK and bypasses those rules entirely.
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "not_an_image" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 400 });
  }

  try {
    const reg = await registryFor(params.id);
    if (!reg) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
    if (!reg.bucket) return NextResponse.json({ error: "no_bucket" }, { status: 500 });

    const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `branding/logo-${Date.now()}.${ext}`;
    const bucket = getStorage().bucket(reg.bucket);
    const blob = bucket.file(path);

    // NOT blob.makePublic(): every clinic bucket is provisioned with uniform
    // bucket-level access (scripts/create-tenant-bucket.mjs sets
    // iamConfiguration.uniformBucketLevelAccess.enabled), which disables
    // per-object ACLs outright — makePublic() is an ACL call and the GCS API
    // 400s under UBLA. The obvious fix, granting `allUsers` objectViewer at
    // the bucket level, is not an option here: these buckets hold client
    // documents, session videos and voice recordings for real children in
    // therapy, and `branding/` is one prefix among all of that. Instead we do
    // what the client SDK's getDownloadURL() does — a Firebase download token
    // in the object's custom metadata, which grants access via the token in
    // the URL rather than an ACL. This is the exact URL shape BrandingTab.tsx
    // already writes to `system_settings/branding.logoUrl` for a clinic-signed
    // upload, so both paths stay consistent.
    const token = randomUUID();
    await blob.save(Buffer.from(await file.arrayBuffer()), {
      resumable: false,
      metadata: { contentType: file.type, metadata: { firebaseStorageDownloadTokens: token } },
    });
    const logoUrl = `https://firebasestorage.googleapis.com/v0/b/${reg.bucket}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

    const previous = await adminDb(reg.databaseId)
      .collection("system_settings")
      .doc("branding")
      .get();
    const previousPath = previous.exists ? (previous.data()?.logoPath as string | undefined) : undefined;

    await adminDb(reg.databaseId)
      .collection("system_settings")
      .doc("branding")
      .set(
        { logoUrl, logoPath: path, updatedAt: new Date().toISOString(), updatedBy: gate.caller.uid },
        { merge: true },
      );

    // Best effort: an orphaned old logo costs pennies, a failed delete must not
    // fail the upload the operator just made.
    if (previousPath && previousPath !== path) {
      bucket.file(previousPath).delete().catch(() => {});
    }

    await logPlatformActivity(reg.databaseId, {
      type: "branding_updated",
      targetName: reg.name,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: { logoPath: path },
    });

    return NextResponse.json({ logoUrl });
  } catch (e: any) {
    console.error("[platform/branding] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);
  if (!clinicDatabaseId(params.id)) {
    return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
  }

  try {
    const reg = await registryFor(params.id);
    if (!reg) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

    const ref = adminDb(reg.databaseId).collection("system_settings").doc("branding");
    const existing = await ref.get();
    const path = existing.exists ? (existing.data()?.logoPath as string | undefined) : undefined;

    await ref.set(
      { logoUrl: "", logoPath: "", updatedAt: new Date().toISOString(), updatedBy: gate.caller.uid },
      { merge: true },
    );
    if (path && reg.bucket) {
      getStorage().bucket(reg.bucket).file(path).delete().catch(() => {});
    }

    await logPlatformActivity(reg.databaseId, {
      type: "branding_updated",
      targetName: reg.name,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: { cleared: true },
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[platform/branding] delete failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
