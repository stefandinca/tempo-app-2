/**
 * Which evaluation protocols a clinic has bought.
 *
 * Stored as an OPT-OUT list (`disabled`) so a clinic with no document has
 * everything enabled — an allowlist would have switched every protocol off for
 * every clinic the moment the rule shipped. `firestore.rules`' evalDisabled()
 * reads this exact field, so the shape is not ours to change unilaterally.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireSuperadmin, platformError, clinicDatabaseId } from "@/lib/platform/gate";
import { logPlatformActivity } from "@/lib/platform/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The five protocol ids the rules and the UI both know. */
const PROTOCOLS = new Set(["ablls", "vbmapp", "portage", "cars", "carolina"]);

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireSuperadmin(req);
  if (!gate.ok) return platformError(gate);

  const derived = clinicDatabaseId(params.id);
  if (!derived) return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });

  let body: { disabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  // Validated against a closed set: an unknown id here would silently disable
  // nothing while looking like it had worked.
  const raw = Array.isArray(body.disabled) ? body.disabled : null;
  if (!raw || raw.some((k) => typeof k !== "string" || !PROTOCOLS.has(k))) {
    return NextResponse.json({ error: "invalid_protocols" }, { status: 400 });
  }
  const disabled = Array.from(new Set(raw as string[]));

  try {
    const registrySnap = await adminDb().collection("tenants").doc(params.id).get();
    if (!registrySnap.exists) {
      return NextResponse.json({ error: "unknown_clinic" }, { status: 404 });
    }
    const t = registrySnap.data() as { name?: string; databaseId?: string };
    const databaseId = t.databaseId || derived;

    await adminDb(databaseId)
      .collection("system_settings")
      .doc("evaluation_access")
      .set(
        { disabled, updatedAt: new Date().toISOString(), updatedBy: gate.caller.uid },
        { merge: true },
      );

    await logPlatformActivity(databaseId, {
      type: "evaluation_access_updated",
      targetName: t.name || params.id,
      caller: { uid: gate.caller.uid, name: gate.caller.name },
      metadata: { disabled },
    });

    return NextResponse.json({ disabled });
  } catch (e: any) {
    console.error("[platform/evaluations] failed:", String(e?.message || e));
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
