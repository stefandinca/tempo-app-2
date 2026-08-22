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
import { clinicDatabaseId } from "@/lib/platform/labels";
import { limitsFor } from "@/lib/platform/licence";
import { hasAnthropicKey } from "@/lib/assistant/anthropic";
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
    // Seven steps returning without throwing is NOT the same as a clinic that
    // works, and treating it as such is how this build has been bitten four
    // times: a thing that passes every check, throws nothing, and is unusable
    // by the person at the end of it. The invite was the last one — an account
    // created with no password, reported `ready`, with a login page the
    // customer could not get past.
    //
    // So `ready` asserts the end state independently, by reading the clinic
    // back rather than trusting the steps that built it.
    const missing = await unusableBecause(rec.label);
    if (missing.length) {
      console.error(`[provision] ${provisionId} finished but is unusable:`, missing.join("; "));
      await ref.set(
        {
          status: "failed",
          errorCode: "internal",
          recovery: recoveryFor("internal"),
          error: `provisioned but unusable: ${missing.join("; ")}`,
          updatedAt: new Date().toISOString(),
          lockedUntil: null,
        },
        { merge: true },
      );
      return `failed:verify:${missing.length}`;
    }

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

/**
 * Everything that would make this clinic unusable, read back from the clinic
 * itself. Empty means it genuinely works.
 *
 * Each check is a property somebody would notice within a minute of trying to
 * use their new clinic, and each has a silent failure mode:
 *
 *   no licence          the clinic runs UNRESTRICTED forever — licenceActive()
 *                       fails open, so every paid limit is silently given away
 *                       and nothing ever prompts anyone to come back
 *   no licence mirror   rules cannot read another database, so the registry
 *                       licence is invisible to enforcement
 *   no Admin            nobody can log in, and every screen says it worked
 *   no member mirror    Storage rules deny them every document, video and voice
 *                       note in their own clinic
 *
 * Deliberately reads rather than trusting the step that wrote. A step that
 * returned without throwing is evidence about the step, not about the clinic.
 */
async function unusableBecause(label: string): Promise<string[]> {
  const missing: string[] = [];
  const databaseId = clinicDatabaseId(label);
  if (!databaseId) return ["label does not derive a database id"];

  const tenant = await adminDb().collection("tenants").doc(label).get();
  const licence = tenant.exists
    ? (tenant.data()?.licence as { expiresAt?: string; tier?: string } | undefined)
    : undefined;
  if (!tenant.exists) missing.push("no tenant record");
  else if (!licence?.expiresAt) missing.push("no licence expiry in the registry");

  // A plan that promises Mira must be able to deliver it. Without a key the
  // clinic is sold "Acces Mira AI", gets a miraEnabled licence, and answers
  // `ai_unavailable` the first time anyone clicks it — silent, correct-looking,
  // and only visible to the customer.
  //
  // Depending on a human to remember an environment variable is not a control.
  // That is the same dependency the admin invite had, and it failed the same
  // way: nothing threw, nothing looked wrong, and the person at the end could
  // not do the thing they paid for. So the system objects instead.
  if (licence?.tier && limitsFor(licence.tier).miraEnabled && !hasAnthropicKey(label)) {
    missing.push("plan includes Mira but no Anthropic key is configured");
  }

  const clinic = adminDb(databaseId);
  const mirror = await clinic.collection("system_settings").doc("licence").get();
  if (!mirror.exists) missing.push("no licence mirror in the clinic");

  const admins = await clinic.collection("team_members").where("role", "==", "Admin").limit(1).get();
  if (admins.empty) missing.push("no Admin in team_members");
  else {
    const uid = admins.docs[0].id;
    const bucket = tenant.data()?.bucket || "";
    const member = await adminDb().collection("tenant_members").doc(`${bucket}__${uid}`).get();
    if (!member.exists) missing.push("no membership mirror for the Admin");
  }

  return missing;
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
  // Filtered in Firestore, sorted here. A `where` plus an `orderBy` on a
  // different field needs a composite index, and the control plane had none —
  // which failed the whole cron pass with a 500 rather than degrading.
  //
  // Sorting in memory also sidesteps a sharper trap: `orderBy` silently DROPS
  // documents that lack the ordered field. A provision written by an older
  // version without `createdAt` would have become invisible to the runner and
  // simply never been built, with nothing anywhere saying so.
  const snap = await adminDb()
    .collection("provisions")
    .where("status", "==", "provisioning")
    .limit(50)
    .get();

  return snap.docs
    .map((d) => ({ id: d.id, createdAt: String(d.data()?.createdAt || "") }))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(0, limit)
    .map((d) => d.id);
}
