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

type LicencePlan = "lifetime" | "term";

export interface LicenceInput {
  plan: LicencePlan;
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

  const notes = String(input.notes || "");
  // A note this long has never been an operator's note; it is the kind of
  // value that fails the Firestore write with a 500 instead of a clean 400.
  // 2000 characters is generous for an operator's reason-for-change.
  if (notes.length > 2000) {
    return { error: "notes_too_long" };
  }

  const base = {
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
    expiresAt: record.expiresAt,
    graceEndsAtMillis: record.graceEndsAtMillis,
    updatedAt: record.updatedAt,
  };
}
