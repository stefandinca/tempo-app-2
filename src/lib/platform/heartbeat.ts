/**
 * When each scheduled job last actually ran.
 *
 * WHY THIS EXISTS
 * Twice in one day a scheduled job was registered, listed by its platform, and
 * never executed. Provisioning silently only advanced while somebody polled the
 * runner by hand; the trial-expiry warning would never have sent at all, which
 * would have charged a card with no notice. Both were found by accident.
 *
 * **A scheduled job that never runs looks exactly like one with nothing to do.**
 * That is the whole problem: silence is the success case, so absence of work is
 * indistinguishable from absence of the worker. Nothing in the system could tell
 * the difference, and nothing was asking.
 *
 * So each job stamps its own name when it runs, and the health screen shows how
 * long ago. A job that has not run in far longer than its schedule is then
 * visible without anyone thinking to check — which is the only property that
 * would have caught either instance.
 *
 * Stamped on RUN, not on success. A pass that ran and found nothing to do is
 * proof the scheduler is alive, which is exactly the question this answers.
 */
import { adminDb } from "@/lib/firebaseAdmin";

/** Every scheduled job, and how often it is expected. */
export const SCHEDULES = {
  "provision-runner": { everyMs: 60_000, label: "Provisioning runner" },
  "licence-notices": { everyMs: 24 * 60 * 60 * 1000, label: "Trial & licence notices" },
} as const;

export type ScheduleName = keyof typeof SCHEDULES;

const DOC = "schedules";

/**
 * Record that a job ran. Never throws.
 *
 * A heartbeat that could fail the work it measures would be worse than no
 * heartbeat: the job would start failing for a reason that has nothing to do
 * with the job.
 */
export async function beat(name: ScheduleName): Promise<void> {
  try {
    await adminDb()
      .collection("platform_meta")
      .doc(DOC)
      .set({ [name]: new Date().toISOString() }, { merge: true });
  } catch (e) {
    console.error(`[heartbeat] could not stamp ${name}:`, (e as Error)?.message);
  }
}

export interface Heartbeat {
  name: string;
  label: string;
  lastRunAt: string | null;
  ageMinutes: number | null;
  /** False when the job has not run in several times its own interval. */
  healthy: boolean;
}

/**
 * How every scheduled job is doing.
 *
 * The staleness allowance is deliberately generous — three intervals, and never
 * less than five minutes — so a single missed tick or a slow deploy does not
 * read as a failure. What it catches is a job that has stopped, which is the
 * case that actually happened, twice.
 */
export async function heartbeats(now = Date.now()): Promise<Heartbeat[]> {
  let data: Record<string, unknown> = {};
  try {
    const snap = await adminDb().collection("platform_meta").doc(DOC).get();
    data = snap.exists ? (snap.data() as Record<string, unknown>) : {};
  } catch (e) {
    console.error("[heartbeat] could not read:", (e as Error)?.message);
  }

  return (Object.keys(SCHEDULES) as ScheduleName[]).map((name) => {
    const cfg = SCHEDULES[name];
    const raw = typeof data[name] === "string" ? (data[name] as string) : null;
    const at = raw ? Date.parse(raw) : NaN;
    const age = Number.isFinite(at) ? now - at : null;
    const allowance = Math.max(cfg.everyMs * 3, 5 * 60_000);
    return {
      name,
      label: cfg.label,
      lastRunAt: raw,
      ageMinutes: age === null ? null : Math.round(age / 60_000),
      // Never run at all is not healthy. That is the state both real failures
      // were in, and treating "no record" as "fine" would reproduce them.
      healthy: age !== null && age < allowance,
    };
  });
}

/**
 * Tell somebody when a scheduled job has stopped.
 *
 * A heartbeat shown on a screen is still "believed to be running" until
 * somebody opens the screen, and nobody will open it on 14 September to check
 * that a trial warning went out. The failure this exists for is precisely a job
 * everyone believed was running, so displaying it is not enough — it has to
 * arrive uninvited.
 *
 * EACH JOB WATCHES THE OTHERS. There is no separate watchdog, because a
 * watchdog on the same schedule as the thing it watches dies with it. The
 * minute-by-minute runner notices the daily job going quiet within hours; the
 * daily job notices the runner. What that cannot catch is every schedule
 * stopping at once — a GCP-wide outage, or the whole project losing its
 * scheduler — which is loud in other ways and is not the failure that has
 * actually happened twice.
 *
 * Once per day per job, so a job that has been dead for a week does not send a
 * thousand emails and get filtered.
 */
export async function alertIfStale(now = Date.now()): Promise<{ stale: string[]; alerted: boolean }> {
  const beats = await heartbeats(now);
  const stale = beats.filter((b) => !b.healthy);
  if (!stale.length) return { stale: [], alerted: false };

  const db = adminDb();
  const ref = db.collection("platform_meta").doc(DOC);
  let alerts: Record<string, unknown> = {};
  try {
    const snap = await ref.get();
    alerts = (snap.data()?.staleAlerts as Record<string, unknown>) || {};
  } catch {
    /* If it cannot be read, err towards sending rather than staying silent. */
  }

  const DAY = 24 * 60 * 60 * 1000;
  const due = stale.filter((b) => {
    const last = Date.parse(String(alerts[b.name] || ""));
    return !Number.isFinite(last) || now - last > DAY;
  });
  if (!due.length) return { stale: stale.map((s) => s.name), alerted: false };

  console.error("[heartbeat] scheduled jobs not running:", due.map((d) => d.name).join(", "));

  const key = process.env.RESEND_API_KEY;
  if (!key) return { stale: stale.map((s) => s.name), alerted: false };
  const to = process.env.PLATFORM_ALERT_TO || process.env.BUG_REPORT_TO || "stefan.dinca07@gmail.com";
  const from = process.env.RESEND_FROM || "TempoApp <bugs@tempoapp.ro>";

  const rows = due
    .map(
      (b) =>
        `<li><strong>${b.label}</strong> — ${b.lastRunAt ? `last ran ${b.ageMinutes} minutes ago` : "has never run"}</li>`,
    )
    .join("");

  const html =
    `<div style="font-family:system-ui,sans-serif;font-size:14px;line-height:1.5">` +
    `<p><strong>A scheduled job has stopped running.</strong></p><ul>${rows}</ul>` +
    `<p>Check the Cloud Scheduler jobs in <code>europe-west1</code>. ` +
    `Provisioning stalls without the runner; trial-expiry warnings do not send without the notices job, ` +
    `which means a card can be charged with no notice.</p>` +
    `<p style="color:#666;font-size:12px">Sent at most once a day per job.</p>` +
    `</div>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject: "TempoApp: a scheduled job has stopped", html }),
    });
    if (!res.ok) {
      console.error("[heartbeat] Resend rejected:", res.status);
      return { stale: stale.map((s) => s.name), alerted: false };
    }
  } catch (e) {
    console.error("[heartbeat] Resend unreachable:", (e as Error)?.message);
    return { stale: stale.map((s) => s.name), alerted: false };
  }

  await ref
    .set(
      { staleAlerts: { ...alerts, ...Object.fromEntries(due.map((d) => [d.name, new Date(now).toISOString()])) } },
      { merge: true },
    )
    .catch(() => {
      /* Recording must never be what stops the next alert. */
    });

  return { stale: stale.map((s) => s.name), alerted: true };
}
