/**
 * The provisioning executor.
 *
 * WHY IT IS A STEP MACHINE AND NOT ONE LONG FUNCTION
 * Creating a clinic takes minutes; a serverless request does not get minutes.
 * So each pass advances ONE step and persists where it got to. Crash-safety
 * falls out of that for free: the record says which step is next, so a function
 * that dies mid-provision resumes rather than restarts.
 *
 * WHY IT IS NOT DRIVEN BY THE STATUS POLL
 * The obvious shortcut is to advance a step each time tempo-web polls. It would
 * even be faster. But the whole reason provisioning is triggered by a webhook
 * rather than a success page is that a customer who closes the tab must still
 * get their clinic — and poll-driven provisioning stalls the moment they do.
 * A cron drives it instead; the poll only reads.
 *
 * STEPS ONLY MOVE FORWARD WITHIN AN ATTEMPT
 * tempo-web's progress display relies on this: it treats an absent step as "no
 * new information" so a transient read cannot jump the bar backwards. The index
 * is therefore compared before it is written, and a step is never re-entered
 * once passed.
 */
import { adminDb } from "@/lib/firebaseAdmin";
import { GcpError } from "./gcp";
import { STEPS, RUNNERS, StepIncomplete, type StepKey, type ProvisionContext } from "./steps";
import { recoveryFor, type ProvisionErrorCode } from "@/lib/platform/provisioning";

/** How long one pass may hold a provision before another runner may take it. */
const LOCK_MS = 120_000;

export interface ProvisionRecord extends ProvisionContext {
  status: "provisioning" | "ready" | "failed";
  step: StepKey;
  stepIndex: number;
  attempt: number;
  startedAt: string;
  createdAt: string;
  updatedAt: string;
  readyAt?: string | null;
  url?: string | null;
  trialEndsAt?: string | null;
  errorCode?: ProvisionErrorCode | null;
  recovery?: string | null;
  error?: string | null;
  lockedUntil?: number | null;
}

/**
 * Which failure this is, and therefore what to offer the customer.
 *
 * The classification matters more than the message. `new_label` asks somebody
 * who has already paid to change their address, so it must only be offered when
 * the address really was the problem; `retry` must only be offered when
 * retrying could plausibly work.
 */
export function classify(e: unknown): ProvisionErrorCode {
  if (e instanceof GcpError) {
    if (e.reason === "RESOURCE_EXHAUSTED" || /quota|limit.*databases/i.test(e.message)) {
      return "quota_exhausted";
    }
    // 429 and 5xx are the same story from our side: the call did not land, and
    // the next one probably will.
    if (e.status === 429 || e.status >= 500) return "transient";
    // 403 is not transient. It means a permission we do not have, and retrying
    // forever hides a misconfiguration behind a customer's patience.
    if (e.status === 403) return "internal";
  }
  const msg = String((e as Error)?.message || "");
  if (/ETIMEDOUT|ECONNRESET|ENOTFOUND|fetch failed|socket hang up/i.test(msg)) return "transient";
  return "internal";
}

/**
 * Advance one provision by one step.
 *
 * Returns what happened, so the caller can log it. Never throws for a
 * provisioning failure — a failure is a recorded outcome, not an exception.
 */
export async function advance(provisionId: string): Promise<string> {
  const ref = adminDb().collection("provisions").doc(provisionId);
  const snap = await ref.get();
  if (!snap.exists) return "missing";

  const rec = snap.data() as ProvisionRecord;
  if (rec.status !== "provisioning") return rec.status;

  // A second runner must not work the same provision concurrently. Steps are
  // idempotent, so a double-run is survivable rather than catastrophic — but
  // two runners racing to write `step` is exactly how a progress bar goes
  // backwards, which is the one thing tempo-web is relying on us to prevent.
  const now = Date.now();
  if (rec.lockedUntil && rec.lockedUntil > now) return "locked";
  await ref.set({ lockedUntil: now + LOCK_MS }, { merge: true });

  const index = STEPS.indexOf(rec.step);
  const key: StepKey = index >= 0 ? rec.step : STEPS[0];

  try {
    await RUNNERS[key](rec);
  } catch (e) {
    if (e instanceof StepIncomplete) {
      // Not finished, not failed. Same step next pass.
      await ref.set({ updatedAt: new Date().toISOString(), lockedUntil: null }, { merge: true });
      return `waiting:${key}`;
    }

    const errorCode = classify(e);
    console.error(`[provision] ${provisionId} step=${key} failed:`, (e as Error)?.message);
    await ref.set(
      {
        status: "failed",
        errorCode,
        recovery: recoveryFor(errorCode),
        // The message is for us. tempo-web branches on `recovery`, never on
        // this — prose is not an interface.
        error: String((e as Error)?.message || e).slice(0, 500),
        updatedAt: new Date().toISOString(),
        lockedUntil: null,
      },
      { merge: true },
    );
    return `failed:${key}:${errorCode}`;
  }

  const nextIndex = STEPS.indexOf(key) + 1;

  if (nextIndex >= STEPS.length) {
    const licence = await trialEndsAtFor(rec.label);
    await ref.set(
      {
        status: "ready",
        step: STEPS[STEPS.length - 1],
        stepIndex: STEPS.length - 1,
        url: `https://${rec.label}.tempoapp.ro`,
        trialEndsAt: licence,
        readyAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lockedUntil: null,
      },
      { merge: true },
    );
    await markSignupProvisioned(rec.signupRef, rec.label);
    return "ready";
  }

  // Forward only. If two passes somehow overlap, the later write cannot move
  // the reported step back to an earlier one.
  const advanceTo = Math.max(nextIndex, rec.stepIndex ?? 0);
  await ref.set(
    {
      step: STEPS[advanceTo],
      stepIndex: advanceTo,
      updatedAt: new Date().toISOString(),
      lockedUntil: null,
    },
    { merge: true },
  );
  return `done:${key}`;
}

/** The trial's end, read from the licence that `register` wrote. */
async function trialEndsAtFor(label: string): Promise<string | null> {
  const snap = await adminDb().collection("tenants").doc(label).get();
  const licence = snap.exists ? (snap.data()?.licence as { expiresAt?: string } | undefined) : undefined;
  return licence?.expiresAt ?? null;
}

/**
 * Close the loop on the signup.
 *
 * Not merely tidy: `provisioned` is what stops a second provision being started
 * for a signup that already has a clinic, and what the confirm endpoint reports
 * back to tempo-web.
 */
async function markSignupProvisioned(signupRef: string, label: string): Promise<void> {
  if (!signupRef) return;
  await adminDb()
    .collection("signups")
    .doc(signupRef)
    .set({ provisioned: true, label, provisionedAt: new Date().toISOString() }, { merge: true })
    .catch((e) => {
      // The clinic exists; failing to stamp the signup must not un-ready it.
      console.error(`[provision] could not mark ${signupRef} provisioned:`, e?.message);
    });
}

/**
 * Every provision still in flight, oldest first.
 *
 * Ordered by creation so a queue drains fairly rather than starving whoever
 * arrived first — and bounded, because a runaway backlog should be visible as a
 * slow queue rather than as a function that times out trying to fix everything
 * at once.
 */
export async function pending(limit = 5): Promise<string[]> {
  const snap = await adminDb()
    .collection("provisions")
    .where("status", "==", "provisioning")
    .orderBy("createdAt", "asc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.id);
}
