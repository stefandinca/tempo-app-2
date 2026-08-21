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
 * Tiers live in this file rather than one of their own because this file must
 * import nothing: `scripts/test-licence.mjs` loads it with plain Node, which
 * cannot resolve an extensionless relative import, and TypeScript refuses the
 * explicit `.ts` extension that would fix it. A separate `tiers.ts` was written
 * first and did not survive contact with that constraint.
 *
 * So this is the licence AND the commercial model: what a clinic bought, what
 * that costs, what it promises, what it limits, and when it stops.
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
  /** The line under the name on the pricing card. */
  tagline: string;
  /** The bullets on the card. Free text — these sell, they do not enforce. */
  features: string[];
  /** The button label on the card. */
  ctaLabel: string;
  /** Draws the "Popular" badge. At most one tier should carry it. */
  popular: boolean;
  /**
   * Free trial length in days. 0 means no trial — Enterprise is quoted and
   * negotiated, so it does not get one.
   */
  trialDays: number;
}

/**
 * WHY a licence is ending, which is what decides whether it gets grace.
 *
 * Grace is not a property of the plan. It is an apology for an administrative
 * gap, and it only makes sense when there was one:
 *
 *   - `trial_ended`   — the trial ran out and nothing was set up to follow it.
 *                       Nothing was owed and nothing failed. No grace.
 *   - `cancelled`     — they chose to leave, before or at the period end.
 *                       Nothing failed. No grace. Extending it would be
 *                       ignoring a decision they made deliberately.
 *   - `payment_failed`— the card declined. THIS is the case the 14 days exist
 *                       for: a real customer, still wanting the service, whose
 *                       card expired or whose bank blocked a foreign charge.
 *
 * An earlier version of this file argued that trials never get grace because "a
 * trial has no card to fail". That stopped being true the moment a card is
 * taken up front: a trial can now end all three ways, and only one of them is
 * anybody's fault. Enforcement reads `graceEndsAtMillis` and nothing else, so
 * this distinction has to be made when the licence is written — by whichever
 * webhook learns the outcome — rather than inferred later from a record where
 * a cancellation and a decline look identical.
 */
export type LicenceEndReason = "trial_ended" | "cancelled" | "payment_failed";

export const END_REASON_GRACE_DAYS: Record<LicenceEndReason, number> = {
  trial_ended: 0,
  cancelled: 0,
  payment_failed: DEFAULT_GRACE_DAYS,
};

/**
 * The grace a licence should carry given why it is ending.
 *
 * Unknown reasons get the GENEROUS answer, deliberately, and for the same
 * reason the licence fails open: an unrecognised value is our bug, and the cost
 * is asymmetric. Too much grace means a clinic keeps working slightly longer
 * than it paid for. Too little means a therapist cannot record a session
 * because a webhook we did not anticipate arrived on a Friday.
 */
export function graceDaysForEnd(reason: unknown): number {
  return reason === "trial_ended" || reason === "cancelled"
    ? 0
    : DEFAULT_GRACE_DAYS;
}

/** Kept as a name for the trial case; grace belongs to the reason now. */
export const TRIAL_GRACE_DAYS = END_REASON_GRACE_DAYS.trial_ended;

/**
 * The licence a clinic starts a trial on: term, expiring after the tier's
 * trial length, with no grace.
 *
 * Deliberately not a distinct "trial" plan. A trial and a lapsed subscription
 * should end the same way — read-only, records intact, nothing deleted — and
 * the rules already do exactly that for a term licence whose grace has passed.
 * Inventing a second mechanism would mean two things to keep correct and two
 * ways to accidentally lock a clinic out of a child's file.
 */
export function buildTrialLicence(
  tier: Tier,
  updatedBy: string,
  now: number = Date.now(),
): LicenceRecord | { error: string } {
  const days = limitsFor(tier).trialDays;
  if (!days) return { error: "tier_has_no_trial" };
  return buildLicence(
    {
      plan: "term",
      tier,
      expiresAt: new Date(now + days * 86400000).toISOString(),
      // The trial's own end is "it ran out" — no grace. If a card is on file
      // and later declines, the payment webhook rewrites this licence with
      // endReason "payment_failed", and grace applies then. Which of the three
      // outcomes it is only becomes knowable on day 30, so this is the safe
      // default rather than a prediction.
      graceDays: graceDaysForEnd("trial_ended"),
      endReason: "trial_ended",
      notes: `${days}-day trial`,
    },
    updatedBy,
  );
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
  starter: {
    label: "Starter",
    monthlyEur: 49,
    maxUsers: 1,
    maxActiveClients: 30,
    tagline: "Pentru practicieni independenți",
    // "Programe terapeutice nelimitate", NOT "Toate evaluările incluse". The
    // latter was transcribed from tempo-web/dist/index.html, which was stale;
    // the live site says the former. The difference is not cosmetic: ABLLS-R,
    // VB-MAPP, Portage and CARS are licensed instruments, and a blanket claim
    // that every evaluation is included reads as a licensing claim the product
    // cannot back. tempoapp.ro removed that wording deliberately.
    features: ["1 Utilizator (Proprietar)", "Până la 30 clienți activi", "Programe terapeutice nelimitate"],
    ctaLabel: "Alege Starter",
    popular: false,
    trialDays: 30,
  },
  professional: {
    label: "Professional",
    monthlyEur: 99,
    maxUsers: 5,
    maxActiveClients: 100,
    tagline: "Pentru clinici în creștere",
    features: ["Până la 5 utilizatori", "Până la 100 clienți activi", "Portal Părinți Inclus"],
    ctaLabel: "Alege Professional",
    popular: true,
    trialDays: 30,
  },
  clinic: {
    // Sold as "Clinică". The key stays ASCII because it travels through ids,
    // payloads and env-shaped places where a diacritic is a liability.
    label: "Clinică",
    monthlyEur: 179,
    maxUsers: 20,
    maxActiveClients: null,
    tagline: "Pentru centre mari",
    features: ["Până la 20 utilizatori", "Clienți nelimitați", "Suport Prioritar"],
    ctaLabel: "Alege Clinică",
    popular: false,
    trialDays: 30,
  },
  enterprise: {
    label: "Enterprise",
    monthlyEur: null,
    maxUsers: null,
    maxActiveClients: null,
    tagline: "Soluții personalizate",
    features: ["Utilizatori nelimitați", "Funcționalități custom", "Manager dedicat"],
    ctaLabel: "Contactează-ne",
    popular: false,
    trialDays: 0,
  },
};

/**
 * The catalogue as it is published for anyone to read — the shape
 * `platform_tiers/catalogue` stores and the marketing site renders from.
 *
 * The numbers and the copy are the SAME record, deliberately. The pricing card
 * says "Până la 30 clienți activi" and the platform caps the clinic at 30
 * because both come from this one entry; keeping the sales copy and the
 * enforced limit in separate places is how a site promises 100 and an app
 * stops at 30.
 */
export interface TierCatalogueEntry extends TierLimits {
  id: Tier;
}

/** What gets published when nothing has been edited yet. */
export function defaultCatalogue(): TierCatalogueEntry[] {
  return TIERS.map((id) => ({ id, ...TIER_LIMITS[id] }));
}

/**
 * Validate and normalise an edited catalogue before it is stored.
 *
 * Returns `{ error }` rather than throwing, like `buildLicence`, so the API
 * route maps it straight to a 400. A malformed catalogue must never be stored:
 * it is read by an anonymous marketing page that has no way to complain, and
 * its numbers cap real clinics.
 */
export function buildCatalogue(
  input: unknown,
): TierCatalogueEntry[] | { error: string } {
  if (!Array.isArray(input)) return { error: "not_an_array" };

  const byId = new Map<Tier, TierCatalogueEntry>();
  for (const raw of input) {
    const e = raw as Partial<TierCatalogueEntry>;
    if (!isTier(e?.id)) return { error: "invalid_tier" };
    if (byId.has(e.id)) return { error: "duplicate_tier" };

    const label = String(e.label ?? "").trim();
    if (!label) return { error: "label_required" };

    // A price or a limit that is present but not a number is refused rather
    // than coerced: Number("") is 0, and 0 means UNLIMITED downstream, so
    // coercion here would silently uncap a paid tier.
    const num = (v: unknown): number | null | undefined => {
      if (v === null || v === undefined || v === "") return null;
      const n = Number(v);
      return Number.isFinite(n) && n >= 0 ? n : undefined;
    };
    const trialDays = num(e.trialDays);
    const monthlyEur = num(e.monthlyEur);
    const maxUsers = num(e.maxUsers);
    const maxActiveClients = num(e.maxActiveClients);
    if (
      monthlyEur === undefined ||
      maxUsers === undefined ||
      maxActiveClients === undefined ||
      trialDays === undefined
    ) {
      return { error: "invalid_number" };
    }

    const features = Array.isArray(e.features)
      ? e.features.map((f) => String(f ?? "").trim()).filter(Boolean).slice(0, 12)
      : [];

    byId.set(e.id, {
      id: e.id,
      label,
      monthlyEur,
      maxUsers,
      maxActiveClients,
      tagline: String(e.tagline ?? "").trim(),
      features,
      ctaLabel: String(e.ctaLabel ?? "").trim(),
      popular: !!e.popular,
      // null here means "not set", which for a trial means none.
      trialDays: trialDays ?? 0,
    });
  }

  // Every tier must be present. A catalogue missing one would render a pricing
  // page with a gap, and leave any clinic already on that tier with no entry to
  // read its limits from.
  for (const t of TIERS) if (!byId.has(t)) return { error: "missing_tier" };

  // Returned in TIERS order rather than the order they arrived, so the pricing
  // page renders cheapest-first without having to sort.
  return TIERS.map((t) => byId.get(t)!);
}

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

/**
 * A tier's limits in the shape `system_settings/config` already stores, which
 * is what the app actually enforces against — `AddClientModal`,
 * `TeamMemberModal`, `ClientCard` and `ClientProfileHeader` all read these two
 * fields and block when the count would exceed them.
 *
 * **Two conventions for "unlimited" meet here, and they are not the same value.**
 * A tier says `null`; the config says `0`, because every enforcement site is
 * written `if (max > 0)`. Getting this backwards in either direction is severe
 * and silent: mapping unlimited to a literal `null` would make `null > 0` false
 * and read as unlimited by luck rather than intent, while mapping a real limit
 * to 0 would switch enforcement off for a clinic that is meant to have a cap.
 * One function, one test, one place to be wrong.
 *
 * `maxUsers` becomes `maxActiveTeamMembers` because that is the field name the
 * clinic settings page has always used. The count behind it already excludes
 * the platform Superadmin, so our own account never consumes a clinic's seat.
 */
export function configLimitsFor(tier: unknown): {
  maxActiveClients: number;
  maxActiveTeamMembers: number;
} {
  const lim = limitsFor(tier);
  return {
    maxActiveClients: lim.maxActiveClients ?? 0,
    maxActiveTeamMembers: lim.maxUsers ?? 0,
  };
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
  /**
   * Why this licence ends, when that is known. Drives grace via
   * `graceDaysForEnd`, and is what lets a cancellation be told from a decline
   * later — from the clinic's side those are identical, and support cannot
   * distinguish them without it.
   */
  endReason?: LicenceEndReason | null;
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
    // null rather than undefined: Firestore drops undefined, and "we do not
    // know why this ends" is a real state worth storing rather than a gap.
    endReason: input.endReason ?? null,
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
    // Mirrored so the clinic's own read-only banner can say WHICH it was.
    // "Your trial ended" and "your card was declined" need different words and
    // lead to different buttons.
    endReason: record.endReason ?? null,
    expiresAt: record.expiresAt,
    graceEndsAtMillis: record.graceEndsAtMillis,
    updatedAt: record.updatedAt,
  };
}
