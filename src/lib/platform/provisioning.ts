/**
 * How a provisioning attempt reports failing.
 *
 * This exists as code rather than only as prose in the handover because another
 * repo is building against it. A contract that lives only in a document drifts
 * the moment someone adds a case and forgets to write it down — and the way
 * that surfaces is the signup flow taking a branch nobody meant, for a customer
 * who has already paid.
 *
 * TWO FIELDS, NOT ONE, and the reason is the whole design.
 *
 * `errorCode` is specific and will grow. If the signup flow branched on it, every
 * code added here would fall into whichever branch tempo-web happened to write
 * last, silently.
 *
 * `recovery` is what the flow actually needs — what to offer the person looking
 * at the screen — and its three values are exhaustive by construction. A new
 * errorCode maps to one of them; the branch never changes.
 */

export type ProvisionErrorCode =
  /** The subdomain was claimed between the pre-check and provisioning. */
  | "label_taken"
  /** The subdomain is reserved or malformed — should have failed check-label. */
  | "label_invalid"
  /**
   * No room left. There is a hard ceiling of 100 Firestore databases per
   * project and every clinic consumes one permanently until it is offboarded.
   * OUR problem, not the customer's: this should page somebody, not merely
   * apologise.
   */
  | "quota_exhausted"
  /** No confirmed payment for this signupRef. */
  | "payment_unconfirmed"
  /**
   * Google or Vercel returned a 5xx, a timeout, or a rate limit. The same
   * inputs will very likely work in a minute.
   *
   * Distinct from `internal` because the two deserve opposite offers. Folding
   * transient failures into `internal` sent every network blip to a support
   * queue, and told a customer whose clinic would have appeared on the next
   * attempt that somebody would be in touch.
   */
  | "transient"
  /** Anything else. Deliberately vague to the caller; specific in our logs. */
  | "internal";

export type ProvisionRecovery =
  /** Only the subdomain is wrong. Offer the picker, retry the same signupRef. */
  | "new_label"
  /** Transient. Offer a retry with the same inputs. */
  | "retry"
  /** Not fixable from a form. Show support and the provisionId. */
  | "support";

const RECOVERY: Record<ProvisionErrorCode, ProvisionRecovery> = {
  label_taken: "new_label",
  label_invalid: "new_label",
  // Not "retry": retrying finds the ceiling still there, and inviting someone
  // to keep trying hides an operational problem behind a customer's patience.
  quota_exhausted: "support",
  // Not "new_label" either — changing the address does not conjure a payment.
  payment_unconfirmed: "support",
  // The only code that earns a retry. Everything below it is either the
  // customer's address to change or ours to investigate; this one is neither.
  transient: "retry",
  internal: "support",
};

/**
 * What to offer the customer, given why it failed.
 *
 * Unknown codes get `support`, never `new_label`. Guessing "the address was
 * probably the problem" asks somebody who has already paid to change something
 * that was never wrong, and then fails again the same way — while burying the
 * real error behind a UI that looks like it is making progress. Saying "we do
 * not know what happened" is both true and actionable.
 */
export function recoveryFor(code: unknown): ProvisionRecovery {
  return (RECOVERY as Record<string, ProvisionRecovery>)[String(code)] ?? "support";
}

export interface ProvisionFailure {
  status: "failed";
  step: string;
  errorCode: ProvisionErrorCode;
  recovery: ProvisionRecovery;
  /** For a human reading a support ticket. Never branched on. */
  error: string;
}

/** Builds the failure body, so `recovery` can never disagree with `errorCode`. */
export function provisionFailure(
  step: string,
  errorCode: ProvisionErrorCode,
  error: string,
): ProvisionFailure {
  return { status: "failed", step, errorCode, recovery: recoveryFor(errorCode), error };
}
