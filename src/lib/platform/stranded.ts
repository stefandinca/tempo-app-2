/**
 * Somebody paid and has no clinic. Notice it, and tell a human.
 *
 * WHY THIS EXISTS, CONCRETELY
 * On 22 Aug 2026 a real signup was confirmed at 15:28 with a live subscription
 * and never provisioned, because the caller's request was rejected and its
 * retry only ran while a browser tab was open. The tab was closed. For forty
 * minutes there was a paying customer with nothing, and **both systems knew**:
 * the marketing site had recorded the failure, the platform had a confirmed
 * signup and no provision. Neither could reach anybody. It was found by hand,
 * while looking for something else.
 *
 * WHY IT CHECKS THE CONDITION, NOT AN ERROR
 * An exception handler can only speak when something throws. This is an
 * assertion about the world, so it notices ABSENCE — a confirmed payment with
 * no clinic behind it — and does not care why. That covers the cases no error
 * handler can see: a return journey that never ran, an outage between two
 * writes, a confirmation that arrived only through the webhook. In those states
 * nothing failed. Nothing happened at all, which is the harder thing to detect.
 *
 * WHO IT TELLS
 * The operator, not the customer. The marketing site owns what the customer
 * sees and already writes to them on a failure it can observe; a second message
 * from a different system would arrive without context and could contradict it.
 * What was missing was not a customer email — it was anyone knowing at all.
 *
 * **Do not add a customer email here.** It is the change somebody will make
 * while being helpful, and it lands in front of a person already reading the
 * marketing site's own message about the same failure. That boundary is
 * recorded on both sides deliberately.
 *
 * TWO ALERTS FOR ONE FAILURE IS CORRECT, NOT A BUG
 * A failure that both throws and stays unprovisioned produces two: the
 * marketing site's, from its catch, in the same second; and this one, from the
 * condition, about fifteen minutes later. That is not duplication worth
 * suppressing. The first says something broke; the second says it is STILL
 * broken a quarter of an hour on, which is the more actionable of the two.
 *
 * Suppressing it would also mean this system reasoning about the other's
 * internal state to decide whether to speak — the coupling that makes both
 * unreliable. If it ever does become noise, the fix belongs here rather than
 * there, because only a scheduled check can know whether the situation
 * persisted.
 */
import { adminDb } from "@/lib/firebaseAdmin";

/**
 * How long after a confirmed payment a missing clinic counts as wrong.
 *
 * A healthy provision takes about three minutes unattended, so fifteen is
 * generous enough never to fire on a slow-but-working run, and short enough
 * that somebody hears within the same coffee break rather than the next day.
 */
export const STRANDED_AFTER_MS = 15 * 60 * 1000;

export interface Stranded {
  signupRef: string;
  label: string | null;
  adminEmail: string | null;
  tier: string | null;
  confirmedAt: string;
  minutesWaiting: number;
}

/**
 * Confirmed payments with no clinic behind them.
 *
 * Reads rather than infers: a signup counts as served only when a provision for
 * it actually reached `ready`. `signups.provisioned` is not trusted on its own,
 * because the write that sets it is the last step of a chain that may not have
 * run — using it here would mean the flag that goes missing during a failure is
 * also the flag that decides whether anyone is told about the failure.
 */
export async function findStranded(now = Date.now()): Promise<Stranded[]> {
  const db = adminDb();
  const signups = await db.collection("signups").get();
  if (signups.empty) return [];

  const provisions = await db.collection("provisions").get();
  const readyRefs = new Set(
    provisions.docs
      .map((d) => d.data())
      .filter((p) => p?.status === "ready")
      .map((p) => String(p?.signupRef || "")),
  );

  const out: Stranded[] = [];
  for (const doc of signups.docs) {
    const s = doc.data();
    const confirmedAt = String(s?.confirmedAt?.toDate?.()?.toISOString?.() || s?.confirmedAt || "");
    if (!confirmedAt) continue; // never paid — nothing owed
    if (s?.provisioned === true) continue;
    if (readyRefs.has(doc.id)) continue;
    if (s?.strandedAlertAt) continue; // already told somebody

    const waited = now - Date.parse(confirmedAt);
    if (!Number.isFinite(waited) || waited < STRANDED_AFTER_MS) continue;

    out.push({
      signupRef: doc.id,
      label: s?.label ?? null,
      adminEmail: s?.adminEmail ?? null,
      tier: s?.tier ?? null,
      confirmedAt,
      minutesWaiting: Math.round(waited / 60000),
    });
  }
  return out;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

async function alert(items: Stranded[]): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[stranded] RESEND_API_KEY not set — cannot alert about", items.length, "signup(s)");
    return false;
  }
  const to = process.env.PLATFORM_ALERT_TO || process.env.BUG_REPORT_TO || "stefan.dinca07@gmail.com";
  const from = process.env.RESEND_FROM || "TempoApp <bugs@tempoapp.ro>";

  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:4px 12px 4px 0">${escapeHtml(i.label || "(no label)")}</td>` +
        `<td style="padding:4px 12px 4px 0">${escapeHtml(i.adminEmail || "-")}</td>` +
        `<td style="padding:4px 12px 4px 0">${escapeHtml(i.tier || "-")}</td>` +
        `<td style="padding:4px 0">${i.minutesWaiting} min</td></tr>`,
    )
    .join("");

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">` +
    `<p><strong>${items.length} paid signup(s) have no clinic.</strong></p>` +
    `<table style="border-collapse:collapse"><tr style="color:#666"><td>label</td><td>email</td><td>tier</td><td>waiting</td></tr>${rows}</table>` +
    `<p>Each has a confirmed payment and no provision that reached <code>ready</code>. ` +
    `They are not retrying on their own.</p>` +
    `<p>To recover one: <code>POST /api/provision/clinic</code> with that signup's details, ` +
    `then watch <code>/api/provision/clinic/{provisionId}</code>.</p>` +
    `<p style="color:#666;font-size:12px">Sent once per signup. Silence means nothing is stranded.</p>` +
    `</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: `TempoApp: ${items.length} paid signup(s) with no clinic`, html }),
    });
    if (!res.ok) {
      console.error("[stranded] Resend rejected:", res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[stranded] Resend unreachable:", (e as Error)?.message);
    return false;
  }
}

/**
 * One pass. Returns what it found, whether or not the alert sent.
 *
 * The signup is stamped ONLY on a successful send, so a failed alert is retried
 * on the next pass rather than counted as delivered — the same rule the licence
 * notices follow, and for the same reason: "we tried and it bounced" and "we
 * never tried" are indistinguishable afterwards unless one of them is recorded.
 */
export async function checkStranded(now = Date.now()): Promise<{ found: number; alerted: boolean }> {
  const items = await findStranded(now);
  if (!items.length) return { found: 0, alerted: false };

  console.error(
    "[stranded] paid signups with no clinic:",
    items.map((i) => `${i.signupRef}(${i.label}, ${i.minutesWaiting}m)`).join(", "),
  );

  const alerted = await alert(items);
  if (alerted) {
    const db = adminDb();
    await Promise.all(
      items.map((i) =>
        db
          .collection("signups")
          .doc(i.signupRef)
          .set({ strandedAlertAt: new Date(now).toISOString() }, { merge: true })
          .catch(() => {
            /* Stamping must never be what stops the next signup being reported. */
          }),
      ),
    );
  }
  return { found: items.length, alerted };
}
