/**
 * Telling a clinic their trial is about to end.
 *
 * WHY THIS EXISTS
 * A card is taken at signup and charged automatically on day 30. Without a
 * warning the first a customer knows about it is the charge — which is a
 * chargeback, a bad review, and in some jurisdictions a compliance problem.
 * It is also the one launch gate that is neither code somebody else can write
 * nor a waiting game: the platform holds the licence and the subscription, so
 * it is the only side that knows day 30 is coming.
 *
 * WHY IT IS DRIVEN BY THE LICENCE, NOT BY STRIPE
 * The licence is what the clinic actually experiences — it is what turns the
 * app read-only when it lapses. Driving the notice from the subscription would
 * mean warning about a charge while the clinic's own copy of the truth said
 * something else, and those two can disagree by exactly one missed webhook.
 */
import { adminDb } from "@/lib/firebaseAdmin";
import { clinicDatabaseId } from "@/lib/platform/labels";
import { defaultCatalogue, type Tier, type TierCatalogueEntry } from "@/lib/platform/licence";
import { WINDOWS, daysUntil, windowFor } from "./noticeWindows";

export { WINDOWS, daysUntil, windowFor };

export interface NoticeResult {
  tenantId: string;
  window: string;
  sent: boolean;
  to?: string[];
  reason?: string;
}

/** Everyone who should hear about it: the clinic's active Admins. */
async function adminEmails(label: string): Promise<string[]> {
  const databaseId = clinicDatabaseId(label);
  if (!databaseId) return [];
  const snap = await adminDb(databaseId).collection("team_members").where("role", "==", "Admin").get();
  return snap.docs
    .map((d) => d.data())
    // `isActive` absent means active — the same reading the rules take, so a
    // clinic's oldest Admin records do not silently stop receiving notices.
    .filter((m) => m?.isActive !== false && typeof m?.email === "string" && m.email.includes("@"))
    .map((m) => String(m.email).trim());
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Romanian only, deliberately.
 *
 * Every clinic on the platform is Romanian and tempoapp.ro sells in Romanian.
 * A language preference per clinic does not exist yet, and guessing from the
 * staff's UI setting would mean a billing notice whose language depends on
 * whoever last changed a toggle.
 */
function body(args: {
  clinicName: string;
  daysLeft: number;
  endsOn: string;
  amount: number | null;
  label: string;
  isTrial: boolean;
}): { subject: string; html: string } {
  const when =
    args.daysLeft <= 1 ? "mâine" : `în ${args.daysLeft} zile`;
  const price = args.amount === null ? null : `${args.amount} EUR`;

  const subject = args.isTrial
    ? `Perioada de probă TempoApp se încheie ${when}`
    : `Licența TempoApp expiră ${when}`;

  // Matches the Terms' first ending: "cardul este taxat și abonamentul începe,
  // fără nicio întrerupere a accesului la platformă".
  const charge = args.isTrial && price
    ? `<p>Dacă nu anulați, cardul înregistrat va fi debitat cu <strong>${escapeHtml(price)}</strong> pe lună și abonamentul începe, fără nicio întrerupere a accesului la platformă.</p>`
    : "";

  // Says how to stop it in the same breath as saying it will happen. A notice
  // that announces a charge without saying how to avoid it is worse than none.
  //
  // THE WORDING IS NOT OURS TO PARAPHRASE. tempo-web's Terms say "needitabil
  // (read-only)", and they carry a clause covering "comunicările noastre" —
  // our emails — which exists precisely because "anulați oricând" gets read as
  // "and nothing happens to my data". Writing "doar-citire" here would be a
  // second phrasing of a promise the customer accepted in one specific form.
  const cancel = args.isTrial
    ? `<p>Dacă nu doriți să continuați, puteți anula oricând înainte de această dată din <strong>Setări → Abonament</strong>. Anularea nu șterge datele clinicii: la finalul perioadei contul devine <strong>needitabil</strong> (read-only), cu toate înregistrările intacte.</p>`
    : `<p>Pentru prelungire, scrieți-ne la <a href="mailto:contact@tempoapp.ro">contact@tempoapp.ro</a>. La expirare contul devine <strong>needitabil</strong> (read-only), cu toate înregistrările intacte — nu se șterge nimic.</p>`;

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
    `<p>Bună ziua,</p>` +
    `<p>${escapeHtml(args.isTrial ? "Perioada de probă" : "Licența")} pentru <strong>${escapeHtml(args.clinicName)}</strong> se încheie pe <strong>${escapeHtml(args.endsOn)}</strong>.</p>` +
    charge +
    cancel +
    `<p><a href="https://${escapeHtml(args.label)}.tempoapp.ro" style="display:inline-block;padding:10px 18px;background:#4A90E2;color:#fff;border-radius:8px;text-decoration:none">Deschideți TempoApp</a></p>` +
    `<p style="color:#666;font-size:13px">Acest mesaj a fost trimis automat pentru că sunteți administrator al acestui cont.</p>` +
    `</div>`;

  return { subject, html };
}

async function send(to: string[], subject: string, html: string): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "RESEND_API_KEY not set" };
  const from = process.env.RESEND_BILLING_FROM || process.env.RESEND_FROM || "TempoApp <contact@tempoapp.ro>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!res.ok) return { sent: false, reason: `resend_${res.status}: ${(await res.text()).slice(0, 160)}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: `resend_unreachable: ${String((e as Error)?.message).slice(0, 120)}` };
  }
}

/**
 * One pass: notify every clinic whose licence is close to expiring.
 *
 * Never throws for one clinic's failure — a bad email address on one tenant
 * must not stop the notice that prevents a chargeback on another.
 */
export async function runNotices(now = Date.now()): Promise<NoticeResult[]> {
  const out: NoticeResult[] = [];
  const tenants = await adminDb().collection("tenants").get();

  let catalogue: TierCatalogueEntry[] = defaultCatalogue();
  try {
    const snap = await adminDb().collection("platform_tiers").doc("catalogue").get();
    const stored = snap.exists ? (snap.data()?.tiers as TierCatalogueEntry[] | undefined) : undefined;
    if (Array.isArray(stored) && stored.length) catalogue = stored;
  } catch {
    /* defaults are fine; the price is a courtesy, not the point of the email */
  }

  for (const doc of tenants.docs) {
    const t = doc.data();
    const licence = t?.licence as { expiresAt?: string; tier?: Tier; endReason?: string } | undefined;
    // No expiry means lifetime, or a clinic with no licence at all. Neither is
    // about to be charged.
    if (!licence?.expiresAt) continue;
    if (t?.status && t.status !== "active") continue;

    const daysLeft = daysUntil(licence.expiresAt, now);
    const already = (t?.licenceNotices || {}) as Record<string, unknown>;
    const win = windowFor(daysLeft, already);
    if (!win) continue;

    const to = await adminEmails(doc.id);
    if (!to.length) {
      out.push({ tenantId: doc.id, window: win.key, sent: false, reason: "no active Admin with an email" });
      continue;
    }

    const entry = catalogue.find((c) => c.id === licence.tier);
    const { subject, html } = body({
      clinicName: String(t?.name || doc.id),
      daysLeft: Math.max(daysLeft, 0),
      endsOn: new Date(licence.expiresAt).toLocaleDateString("ro-RO", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      amount: entry?.monthlyEur ?? null,
      label: doc.id,
      isTrial: licence.endReason === "trial_ended",
    });

    const result = await send(to, subject, html);

    // Recorded whether or not it sent, but only a SUCCESS suppresses the next
    // pass. A failed send must be retried tomorrow rather than counted as done.
    await doc.ref
      .set(
        {
          licenceNotices: {
            ...already,
            ...(result.sent ? { [win.key]: new Date(now).toISOString() } : {}),
            [`${win.key}_lastAttempt`]: new Date(now).toISOString(),
            ...(result.sent ? {} : { [`${win.key}_error`]: result.reason || "unknown" }),
          },
        },
        { merge: true },
      )
      .catch(() => {
        /* Recording must never be what stops the next clinic being told. */
      });

    out.push({ tenantId: doc.id, window: win.key, sent: result.sent, to, reason: result.reason });
  }

  return out;
}
