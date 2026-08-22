/**
 * Telling US when a signup breaks.
 *
 * WHY THIS EXISTS
 * tempo-web's failure screen says, in Romanian, that we have already been
 * notified and are picking up where the setup stopped. That sentence was not
 * true: a failed provision was written to `provisions/{id}` and to the function
 * log, and nothing else happened. Nobody was told, no screen listed it, and the
 * customer — who has paid and been asked not to sign up again — was left
 * waiting on a promise the platform never kept.
 *
 * So the promise is implemented rather than reworded. The copy stays; this is
 * what makes it honest.
 *
 * DELIBERATELY NON-FATAL AND NEVER THROWS
 * Every caller is already handling a failure. An alert that throws would turn
 * "the hostname step failed" into "the runner crashed while reporting that the
 * hostname step failed", losing the recorded status that the retry depends on.
 * A failure to alert is returned, logged, and otherwise ignored.
 */
import { adminDb } from "@/lib/firebaseAdmin";

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Who hears about it.
 *
 * `PLATFORM_ALERT_EMAIL` first, so an operator can point alerts at a shared
 * inbox or a pager address. Otherwise the platform's own Superadmins, read from
 * the control plane — the same source `addPlatformSuperadmins` uses, so there
 * is no second list of people to forget to update when somebody joins or
 * leaves.
 */
async function recipients(): Promise<string[]> {
  const configured = (process.env.PLATFORM_ALERT_EMAIL || "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.includes("@"));
  if (configured.length) return configured;

  const snap = await adminDb()
    .collection("team_members")
    .where("role", "in", ["Superadmin", "superadmin"])
    .get();
  return snap.docs
    .map((d) => String(d.data()?.email || "").trim())
    .filter((e) => e.includes("@"));
}

export interface AlertResult {
  sent: boolean;
  reason?: string;
}

/**
 * Send one operational alert.
 *
 * English, unlike the billing notices: this goes to us, not to a clinic, and
 * it quotes error strings that are English anyway.
 */
export async function alertPlatform(subject: string, lines: string[]): Promise<AlertResult> {
  try {
    const key = (process.env.RESEND_API_KEY || "").trim();
    if (!key) return { sent: false, reason: "RESEND_API_KEY not set" };

    const to = await recipients();
    if (!to.length) return { sent: false, reason: "no alert recipient configured" };

    const from = process.env.RESEND_FROM || "TempoApp <contact@tempoapp.ro>";
    const html =
      `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
      lines.map((l) => `<p style="margin:0 0 8px">${escapeHtml(l)}</p>`).join("") +
      `<p style="margin-top:16px"><a href="https://superadmin.tempoapp.ro/platform/provisions">Open the signups screen</a></p>` +
      `</div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `[TempoApp] ${subject}`, html }),
    });
    if (!res.ok) {
      return { sent: false, reason: `resend_${res.status}: ${(await res.text()).slice(0, 160)}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: String((e as Error)?.message || e).slice(0, 200) };
  }
}
