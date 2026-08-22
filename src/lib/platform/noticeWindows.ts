/**
 * When a licence-expiry notice is due. Pure arithmetic, no dependencies.
 *
 * Split out for the same reason licence.ts imports nothing: a plain-Node test
 * can load it directly, and this is logic whose BOTH failure modes are silent.
 * Sending twice reads as an eager system; never sending is what charges a card
 * with no warning. Neither throws, neither fails a build, and neither is
 * visible from any screen — so they get asserted rather than reviewed.
 */
/**
 * How many days before expiry to write, and the key each notice is recorded
 * under so it is sent once.
 *
 * Seven days is enough to cancel without hurrying; one day is the honest last
 * call for somebody who ignored the first. More than two notices reads as
 * pressure rather than courtesy.
 */
export const WINDOWS = [
  { days: 7, key: "d7" },
  { days: 1, key: "d1" },
] as const;

export interface NoticeResult {
  tenantId: string;
  window: string;
  sent: boolean;
  to?: string[];
  reason?: string;
}

const DAY = 86_400_000;

/** Whole days from now until an ISO instant. Negative once it has passed. */
export function daysUntil(iso: string, now = Date.now()): number {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return NaN;
  return Math.ceil((t - now) / DAY);
}

/**
 * Which window a licence falls into, or null.
 *
 * Uses `<=` rather than `===` so a cron that misses a day — a deploy, an
 * outage, a clock that drifted — still sends the notice late rather than never.
 * A late warning is worth far more than a missed one, and the sent-record stops
 * it repeating.
 */
export function windowFor(daysLeft: number, already: Record<string, unknown>): (typeof WINDOWS)[number] | null {
  if (!Number.isFinite(daysLeft) || daysLeft < 0) return null;
  for (const w of WINDOWS) {
    if (daysLeft <= w.days && !already[w.key]) return w;
  }
  return null;
}
