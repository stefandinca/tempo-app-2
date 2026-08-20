// Diagnostic endpoint for the AI integration. Reports configuration status
// WITHOUT exposing any secret values (no keys, no private key, no tokens).
// Safe to expose; intended for setup/debugging and can be removed afterwards.
import { NextRequest, NextResponse } from "next/server";
import { tenantIdFromRequest } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const out: Record<string, unknown> = {};

  // --- Anthropic ---
  // Reports on THIS host's clinic: one deployment serves them all, and each
  // has its own key, so a platform-wide answer would be meaningless.
  const tenantId = tenantIdFromRequest(req);
  const { anthropicKeyFor, getAnthropic } = await import("@/lib/assistant/anthropic");
  const anthropicKey = anthropicKeyFor(tenantId);
  out.tenant = tenantId || "(platform)";
  out.anthropicKeyPresent = !!anthropicKey;
  out.anthropicKeyLooksValid = anthropicKey.startsWith("sk-ant-");
  if (anthropicKey) {
    try {
      await getAnthropic(tenantId).models.list({ limit: 1 });
      out.anthropic = "ok";
    } catch (e: any) {
      out.anthropic = "error: " + String(e?.status || e?.message || e).slice(0, 160);
    }
  } else {
    out.anthropic = "missing_key";
  }

  // --- Firebase service account (parse only; reveals no secrets) ---
  try {
    const { loadServiceAccount } = await import("@/lib/firebaseAdmin");
    const { sa, source } = loadServiceAccount();
    out.serviceAccount = "parsed";
    out.serviceAccountSource = source; // "json" | "base64"
    out.projectId = sa.project_id || null;
    out.hasClientEmail = !!sa.client_email;
    out.hasPrivateKey = !!sa.private_key;
    out.privateKeyHasNewlines = !!sa.private_key && sa.private_key.includes("\n");
  } catch (e: any) {
    out.serviceAccount = "error: " + String(e?.message || e).slice(0, 200);
  }

  // --- Live Admin round-trip (this is what actually fails when the key is mangled) ---
  if (out.serviceAccount === "parsed") {
    try {
      const { adminDb } = await import("@/lib/firebaseAdmin");
      await adminDb().collection("user_ai_usage").limit(1).get();
      out.firestore = "ok";
    } catch (e: any) {
      out.firestore = "error: " + String(e?.message || e).slice(0, 200);
    }
  }

  // --- Resend (bug reports) ---
  // Presence only, never the value. Bug reports are saved whether or not this
  // is configured, so this is the only way to tell that the email half is off.
  out.resendKeyPresent = !!process.env.RESEND_API_KEY;
  out.bugReportTo = process.env.BUG_REPORT_TO || "stefan.dinca07@gmail.com";
  out.resendFrom = process.env.RESEND_FROM || "TempoApp <bugs@tempoapp.ro>";

  out.ok =
    out.anthropic === "ok" && out.serviceAccount === "parsed" && out.firestore === "ok";

  return NextResponse.json(out, { status: out.ok ? 200 : 503 });
}
