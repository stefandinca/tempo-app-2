/** Shapes shared by the /api/platform routes and the console pages. */

/** One row of the clinics list. */
export interface ClinicSummary {
  tenantId: string;
  name: string;
  databaseId: string;
  bucket: string;
  status: string;
  isDemo: boolean;
  host: string;
  counts: { clients: number; staff: number; events: number };
  /** From the registry (`tenants/{id}.licence`). Null means no licence set — unlimited. */
  licence: { plan: string; expiresAt: string | null } | null;
}

/** One clinic's detail page. */
export interface ClinicDetail extends ClinicSummary {
  /** Protocol ids switched OFF for this clinic; [] means everything enabled. */
  disabledEvaluations: string[];
  brandingLogoUrl: string | null;
  /** From system_settings/config — the clinic's own billing identity. */
  legalName: string | null;
  staff: Array<{ uid: string; name: string; role: string; email: string }>;
  /**
   * graceDays and notes come from the REGISTRY, not the mirror — the mirror
   * deliberately does not carry them, since Firestore rules never read them.
   * An intersection on the detail type only: ClinicSummary.licence stays the
   * narrower shape the list screen needs.
   */
  licence:
    | (NonNullable<ClinicSummary["licence"]> & { graceDays: number; notes: string; tier: string })
    | null;
}

export interface BugReport {
  id: string;
  tenantId: string;
  host: string;
  page: string;
  title: string;
  description: string;
  status: string;
  reportedBy: { name?: string; role?: string; uid?: string } | null;
  userAgent: string;
  createdAt: string | null;
}

export interface Lead {
  id: string;
  /** Which funnel this came from. `marketing` rows carry a status. */
  source: "marketing" | "demo";
  name: string;
  email: string;
  phone: string;
  /** Marketing only — what they wrote in the contact form. */
  message: string;
  /** Marketing only — e.g. "4-10 Terapeuți". */
  teamSize: string;
  /** Demo only — the centre name they typed. */
  clinic: string;
  /** Marketing only; null for demo rows, which have no status field. */
  status: string | null;
  createdAt: string | null;
}

export interface ClinicSpend {
  tenantId: string;
  name: string;
  conversations: number;
  insightEvents: number;
  costUsd: number;
  /**
   * True when at least one of the two ledgers could not be read, so every
   * number on this row is short by an unknown amount. The console renders a
   * partial row as "—" and leaves it out of the total: this figure is what a
   * clinic's invoice gets reconciled against, and a cost that is silently low
   * is worse than one that admits it does not know.
   */
  partial: boolean;
}

export interface ClinicHealth {
  tenantId: string;
  name: string;
  databaseReachable: boolean;
  bucketConfigured: boolean;
  anthropicKeyPresent: boolean;
  licencePresent: boolean;
  /**
   * Whether the clinic's mirrored licence matches the registry. They are two
   * documents in two databases; drift means the console shows one thing and the
   * rules enforce another.
   */
  licenceInSync: boolean;
  error: string | null;
}

/**
 * One self-onboarding attempt, as the console shows it.
 *
 * `error` is the raw message the step threw. It is the reason this screen
 * exists, so it is passed through whole rather than summarised — a shortened
 * error sends whoever is reading it back to the function logs, which is the
 * thing this screen replaces.
 */
export interface ProvisionRow {
  provisionId: string;
  signupRef: string;
  label: string;
  clinicName: string;
  adminEmail: string;
  tier: string;
  status: "provisioning" | "ready" | "failed";
  /** A key from the seven-step enum, never display text. */
  step: string;
  attempt: number;
  errorCode: string | null;
  recovery: string | null;
  error: string | null;
  url: string | null;
  /**
   * Whether the new Admin got their password link. Null on older records that
   * predate the invite. A clinic can be `ready` with this false — complete,
   * correct, and impossible to log into.
   */
  inviteSent: boolean | null;
  inviteError: string | null;
  startedAt: string | null;
  updatedAt: string | null;
}

/** One sale, and whether anything was ever built for it. */
export interface SignupRow {
  signupRef: string;
  clinicName: string;
  label: string;
  adminEmail: string;
  tier: string;
  /** False for a signup made against Stripe test mode. */
  livemode: boolean;
  /** Written by the Stripe webhook. Null means this platform has no evidence of payment. */
  confirmedAt: string | null;
  provisioned: boolean;
  /** Whether any provision attempt exists for this signup. */
  provisionStarted: boolean;
  /** Set when a create call was refused — `payment_unconfirmed` or `signup_missing`. */
  blockedReason: string | null;
  blockedAttempts: number | null;
  blockedAt: string | null;
  createdAt: string | null;
}
