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
