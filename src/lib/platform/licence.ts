/**
 * What a licence is, and the one place its grace deadline is computed.
 *
 * Dependency-free on purpose, like `src/lib/tenant.ts` and
 * `src/lib/platform/labels.ts`: `scripts/test-licence.mjs` loads it directly
 * with plain Node, which resolves neither `@/*` nor `next/server`.
 *
 * `graceEndsAtMillis` is the field Firestore rules actually compare against, as
 * epoch milliseconds, because a rule can do `request.time.toMillis() < n` with
 * no date parsing and no timezone question. Everything else on the record is
 * for humans.
 */

export const DEFAULT_GRACE_DAYS = 14;

/**
 * The tier vocabulary lives HERE, not in ./tiers.ts, because this file must
 * import nothing — scripts/test-licence.mjs loads it with plain Node, which
 * cannot resolve an extensionless relative import, and TypeScript refuses the
 * explicit .ts extension that would fix it. ./tiers.ts holds the commercial
 * detail (prices, user and client limits) and re-exports these, so callers
 * still have one import to reach for and nothing is defined twice.
 */
export type Tier = "starter" | "professional" | "clinic" | "enterprise";

export const TIERS: Tier[] = ["starter", "professional", "clinic", "enterprise"];

/** What a clinic gets when nothing says otherwise. */
export const DEFAULT_TIER: Tier = "professional";

export function isTier(value: unknown): value is Tier {
  return typeof value === "string" && (TIERS as string[]).includes(value);
}

export interface TierLimits {
  /** Display name as sold. Romanian where the site sells it in Romanian. */
  label: string;
  /** Monthly price in EUR, or null where the site says "contact us". */
  monthlyEur: number | null;
  /** Staff accounts, counting the owner. null = unlimited. */
  maxUsers: number | null;
  /** Active clients. null = unlimited. */
  maxActiveClients: number | null;
}

/**
 * Transcribed from the pricing section of tempoapp.ro on 22 Aug 2026.
 *
 * **This is a copy of a commercial decision, not the decision itself.** If the
 * pricing page changes, nothing here notices — the two are kept in step by hand,
 * and a mismatch means a clinic is limited to something other than what it was
 * sold. The suite asserts these agree with `TIERS`; nothing can assert the
 * numbers are current.
 *
 * `null` means unlimited throughout. Deliberately not `0` and not `Infinity`:
 * null survives a Firestore round trip unchanged, and cannot be mistaken for
 * "none allowed" the way 0 can.
 */
export const TIER_LIMITS: Record<Tier, TierLimits> = {
  starter: { label: "Starter", monthlyEur: 49, maxUsers: 1, maxActiveClients: 30 },
  professional: { label: "Professional", monthlyEur: 99, maxUsers: 5, maxActiveClients: 100 },
  // Sold as "Clinică". The key stays ASCII because it travels through ids,
  // payloads and env-shaped places where a diacritic is a liability.
  clinic: { label: "Clinică", monthlyEur: 179, maxUsers: 20, maxActiveClients: null },
  enterprise: { label: "Enterprise", monthlyEur: null, maxUsers: null, maxActiveClients: null },
};

/**
 * Limits for a tier, falling back to the most permissive rather than the most
 * restrictive when the value is unrecognised.
 *
 * That direction is deliberate. An unreadable tier is our bug, not the clinic's,
 * and the cost of guessing wrong is asymmetric: too permissive means we
 * under-charge someone until we notice, too restrictive means a clinic cannot
 * add a therapist or admit a child on a Monday morning. Same reasoning as the
 * licence failing open.
 */
export function limitsFor(tier: unknown): TierLimits {
  return isTier(tier) ? TIER_LIMITS[tier] : TIER_LIMITS.enterprise;
}

type LicencePlan = "lifetime" | "term";

export interface LicenceInput {
  plan: LicencePlan;
  /** What the clinic bought. Drives limits; see ./tiers.ts. */
  tier: Tier;
  /** ISO date. Ignored — and stored as null — when the plan is "lifetime". */
  expiresAt: string | null;
  graceDays: number;
  notes: string;
}

export interface LicenceRecord extends LicenceInput {
  /** null means "never expires". Rules treat null as unrestricted. */
  graceEndsAtMillis: number | null;
  updatedAt: string;
  updatedBy: string;
}

/**
 * Validate and normalise. Returns `{ error }` rather than throwing so the API
 * route can map it straight to a 400 — a malformed licence must never reach
 * Firestore, because the mirror is what rules enforce against.
 */
export function buildLicence(
  input: LicenceInput,
  updatedBy: string,
): LicenceRecord | { error: string } {
  if (input.plan !== "lifetime" && input.plan !== "term") {
    return { error: "invalid_plan" };
  }
  if (!Number.isFinite(input.graceDays) || input.graceDays < 0) {
    return { error: "invalid_grace" };
  }
  if (!isTier(input.tier)) {
    return { error: "invalid_tier" };
  }

  const notes = String(input.notes || "");
  // A note this long has never been an operator's note; it is the kind of
  // value that fails the Firestore write with a 500 instead of a clean 400.
  // 2000 characters is generous for an operator's reason-for-change.
  if (notes.length > 2000) {
    return { error: "notes_too_long" };
  }

  const base = {
    tier: input.tier,
    graceDays: input.graceDays,
    notes,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  if (input.plan === "lifetime") {
    // A date on a lifetime licence is dropped rather than kept and ignored:
    // a stored value nothing reads is the kind of thing someone later "fixes"
    // by starting to read it.
    return { plan: "lifetime", expiresAt: null, graceEndsAtMillis: null, ...base };
  }

  if (!input.expiresAt) return { error: "expiry_required" };
  const expiryMs = Date.parse(input.expiresAt);
  if (Number.isNaN(expiryMs)) return { error: "invalid_expiry" };

  return {
    plan: "term",
    expiresAt: new Date(expiryMs).toISOString(),
    graceEndsAtMillis: expiryMs + input.graceDays * 86400000,
    ...base,
  };
}

/** The subset mirrored into a clinic. Rules read only these. */
export function licenceMirror(record: LicenceRecord) {
  return {
    plan: record.plan,
    // Mirrored so the clinic can read its OWN limits without a control-plane
    // round trip. Rules do not read it today — tier limits are not enforced
    // yet — but the value has to be present before anything can start.
    tier: record.tier,
    expiresAt: record.expiresAt,
    graceEndsAtMillis: record.graceEndsAtMillis,
    updatedAt: record.updatedAt,
  };
}
