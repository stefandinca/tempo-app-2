/**
 * Sets a clinic's licence.
 *
 * TWO WRITES, AND THE ORDER IS THE SAFETY PROPERTY.
 *
 *   1. `tenants/{id}.licence` in the control plane — the source of truth.
 *   2. `system_settings/licence` in the clinic's own database — the mirror
 *      Firestore rules actually enforce against, because a rule cannot read
 *      another database.
 *
 * Registry FIRST, mirror second. If the mirror write fails after the registry
 * succeeded, the console shows a licence that is not yet enforced: the clinic
 * keeps working. The reverse order would risk enforcing a licence the console
 * cannot see — a clinic frozen with no visible reason. Fail open, always, in
 * the direction of the clinic continuing to work.
 *
 * The response says whether the mirror landed. The health screen reports drift
 * separately, so a half-applied licence is visible rather than assumed.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import { tenantIdentity } from "@/lib/platform/counts";
import { buildLicence, licenceMirror, DEFAULT_TIER, type LicenceInput } from "@/lib/platform/licence";

import { logPlatformActivity } from "@/lib/platform/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  if (!clinicDatabaseId(params.id)) {
    return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
  }

  let body: Partial<LicenceInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  // `req.json()` succeeds on the JSON literal `null` (it is valid JSON), so a
  // `null` or otherwise non-object body reaches here without throwing. Reject
  // it explicitly rather than letting `body.plan` below raise an uncaught
  // TypeError that Next would turn into a generic 500 — the route's contract
  // is that malformed input is a 400.
  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const built = buildLicence(
    {
      plan: body.plan as LicenceInput["plan"],
      // Defaulted rather than required, so a caller written before tiers
      // existed still saves a valid licence instead of 400ing. buildLicence
      // rejects a tier that is present but unrecognised.
      tier: (body.tier ?? DEFAULT_TIER) as LicenceInput["tier"],
      expiresAt: body.expiresAt ?? null,
      graceDays: Number(body.graceDays),
      notes: String(body.notes || ""),
    },
    gate.caller.uid,
  );
  if ("error" in built) {
    return NextResponse.json({ error: built.error }, { status: 400 });
  }

  try {
    const registryRef = adminDb().collection("tenants").doc(params.id);
    const registrySnap = await registryRef.get();
    if (!registrySnap.exists) {
      return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
    }
    // The same derivation every other platform route uses: an explicit
    // `databaseId` on the registry document wins over `clinic-<id>`, and it
    // goes through `clinicDatabaseId()`'s validation rather than being
    // string-concatenated inline again here.
    const identity = tenantIdentity(registrySnap);
    if (!identity) {
      return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
    }
    const t = registrySnap.data() as { name?: string; databaseId?: string };
    const databaseId = identity.databaseId;

    // 1. Source of truth.
    await registryRef.set({ licence: built }, { merge: true });

    // 2. The mirror rules read. A failure here leaves the clinic unrestricted,
    //    which is the safe direction, so it is reported rather than rolled back.
    let mirrored = true;
    try {
      await adminDb(databaseId)
        .collection("system_settings")
        .doc("licence")
        .set(licenceMirror(built), { merge: true });
    } catch (e: any) {
      mirrored = false;
      console.error("[platform/licence] mirror failed:", String(e?.message || e));
    }

    await logPlatformActivity(databaseId, {
      type: "licence_updated",
      targetName: t.name || params.id,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: {
        plan: built.plan,
        expiresAt: built.expiresAt,
        graceDays: built.graceDays,
        mirrored,
      },
    });

    return NextResponse.json({ licence: built, mirrored });
  } catch (e: any) {
    console.error("[platform/licence] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
