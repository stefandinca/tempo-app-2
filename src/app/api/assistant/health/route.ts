// Diagnostic endpoint for the AI integration. Reports configuration status
// WITHOUT exposing any secret values (no keys, no private key, no tokens).
// Safe to expose; intended for setup/debugging and can be removed afterwards.
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {};

  // --- Anthropic ---
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";
  out.anthropicKeyPresent = !!anthropicKey;
  out.anthropicKeyLooksValid = anthropicKey.startsWith("sk-ant-");
  if (anthropicKey) {
    try {
      const { getAnthropic } = await import("@/lib/assistant/anthropic");
      await getAnthropic().models.list({ limit: 1 });
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

  out.ok =
    out.anthropic === "ok" && out.serviceAccount === "parsed" && out.firestore === "ok";

  return NextResponse.json(out, { status: out.ok ? 200 : 503 });
}
