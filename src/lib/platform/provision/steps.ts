/**
 * The seven steps that turn a paid signup into a clinic.
 *
 * THE ORDERING IS A SAFETY PROPERTY, NOT A PREFERENCE
 * The failure that matters is a database created but rules not yet deployed:
 * a window where a clinic's records sit with no rules over them. `rules`
 * therefore follows `database` immediately, before anything can write a single
 * document, and nothing reports `ready` until every step has passed.
 *
 * EVERY STEP IS IDEMPOTENT
 * Each one checks whether its work is already done and returns quietly if so.
 * That is what makes a retry safe: provisioning resumes at the step that failed
 * rather than starting again, and a step that half-succeeded before a timeout
 * is simply re-run.
 *
 * STEP NAMES ARE A SHARED CONTRACT
 * tempo-web localises this exact enum into Romanian for its progress display,
 * which is why the platform sends the key and never a human-readable string:
 * display copy living in two repos with different review paths means the first
 * Romanian typo is fixable only by someone with deploy access to this one.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { gcp, GcpError, awaitOperation, projectId } from "./gcp";
import { SERVICES, PROGRAMS, configDoc } from "./seed";
import { clinicDatabaseId } from "@/lib/platform/labels";
import { buildTrialLicence, licenceMirror, configLimitsFor, type Tier } from "@/lib/platform/licence";

export const STEPS = [
  "database",
  "rules",
  "bucket",
  "seed",
  "register",
  "hostname",
  "admin",
] as const;

export type StepKey = (typeof STEPS)[number];

export interface ProvisionContext {
  provisionId: string;
  signupRef: string;
  label: string;
  clinicName: string;
  adminEmail: string;
  adminName: string;
  tier: Tier;
  plan: string;
  dpa: { version: string; acceptedAt: string };
}

/**
 * Thrown by a step that has not failed but is not finished — a database still
 * being created, most often.
 *
 * Distinct from an error on purpose. Treating "still working" as a failure
 * would strand a clinic that was seconds from existing, and treating it as
 * success would let provisioning run ahead of a database that does not yet
 * accept writes.
 */
export class StepIncomplete extends Error {}

const ACTOR = "provision";
const bucketName = (label: string) => `${projectId()}-${label}`;
const hostFor = (label: string) => `${label}.tempoapp.ro`;

/**
 * The clinic's database id, or a loud failure.
 *
 * `clinicDatabaseId` returns null for a label it will not derive from, and the
 * endpoint has already rejected those — but a cast would mean a future caller
 * silently building `clinic-null` and provisioning a clinic into a database
 * nobody can find. Throwing keeps the impossible case impossible.
 */
function databaseFor(label: string): string {
  const id = clinicDatabaseId(label);
  if (!id) throw new Error(`label ${JSON.stringify(label)} does not derive a database id`);
  return id;
}

/** Repo file, read at runtime so what is deployed is byte-identical to source. */
function repoFile(name: string): string {
  return readFileSync(path.join(process.cwd(), name), "utf8");
}

// ---------------------------------------------------------------------------
// 1. database
// ---------------------------------------------------------------------------

async function stepDatabase(ctx: ProvisionContext): Promise<void> {
  const p = projectId();
  const db = databaseFor(ctx.label);
  const url = `https://firestore.googleapis.com/v1/projects/${p}/databases/${db}`;

  try {
    await gcp(url);
    return; // Already there. A retry of a step that succeeded costs nothing.
  } catch (e) {
    if (!(e instanceof GcpError) || e.status !== 404) throw e;
  }

  let op: { name?: string; done?: boolean };
  try {
    op = await gcp<{ name?: string; done?: boolean }>(
      `https://firestore.googleapis.com/v1/projects/${p}/databases?databaseId=${encodeURIComponent(db)}`,
      {
        method: "POST",
        // eur3 keeps clinical data in the EU, matching every existing clinic.
        // PESSIMISTIC concurrency matches them too — a clinic that behaved
        // differently under contention would be a bug nobody could reproduce.
        body: { type: "FIRESTORE_NATIVE", locationId: "eur3", concurrencyMode: "PESSIMISTIC" },
      },
    );
  } catch (e) {
    // A database created between our GET and our POST is success, not failure.
    if (e instanceof GcpError && e.reason === "ALREADY_EXISTS") return;
    throw e;
  }

  if (op.done) return;
  if (op.name && (await awaitOperation(op.name))) return;
  throw new StepIncomplete("database still being created");
}

// ---------------------------------------------------------------------------
// 2. rules  (and indexes)
// ---------------------------------------------------------------------------

interface Ruleset {
  name: string;
}

async function createRuleset(p: string, fileName: string, content: string): Promise<string> {
  const rs = await gcp<Ruleset>(`https://firebaserules.googleapis.com/v1/projects/${p}/rulesets`, {
    method: "POST",
    body: { source: { files: [{ name: fileName, content }] } },
  });
  return rs.name;
}

/** Point a release at a ruleset, creating the release the first time. */
async function release(p: string, releaseId: string, rulesetName: string): Promise<void> {
  const full = `projects/${p}/releases/${releaseId}`;
  try {
    await gcp(`https://firebaserules.googleapis.com/v1/projects/${p}/releases`, {
      method: "POST",
      body: { name: full, rulesetName },
    });
  } catch (e) {
    if (!(e instanceof GcpError) || e.reason !== "ALREADY_EXISTS") throw e;
    await gcp(`https://firebaserules.googleapis.com/v1/${full}`, {
      method: "PATCH",
      body: { release: { name: full, rulesetName } },
    });
  }
}

async function stepRules(ctx: ProvisionContext): Promise<void> {
  const p = projectId();
  const db = databaseFor(ctx.label);

  const rulesetName = await createRuleset(p, "firestore.rules", repoFile("firestore.rules"));
  await release(p, `cloud.firestore/${db}`, rulesetName);

  // Indexes are per database and do not sync. A clinic without them looks fine
  // until the first calendar or billing query, which fails with a link to
  // create the index by hand — for a clinic whose staff cannot see the console.
  const spec = JSON.parse(repoFile("firestore.indexes.json")) as {
    indexes?: { collectionGroup: string; queryScope: string; fields: unknown[] }[];
    fieldOverrides?: { collectionGroup: string; fieldPath: string; indexes?: unknown[] }[];
  };

  for (const idx of spec.indexes || []) {
    const url =
      `https://firestore.googleapis.com/v1/projects/${p}/databases/${db}` +
      `/collectionGroups/${encodeURIComponent(idx.collectionGroup)}/indexes`;
    try {
      await gcp(url, {
        method: "POST",
        body: { queryScope: idx.queryScope, fields: idx.fields },
      });
    } catch (e) {
      // An index that already exists, in any of the several ways Google says so.
      if (e instanceof GcpError && (e.reason === "ALREADY_EXISTS" || e.status === 409)) continue;
      throw e;
    }
  }

  for (const f of spec.fieldOverrides || []) {
    const url =
      `https://firestore.googleapis.com/v1/projects/${p}/databases/${db}` +
      `/collectionGroups/${encodeURIComponent(f.collectionGroup)}/fields/${encodeURIComponent(f.fieldPath)}` +
      `?updateMask=indexConfig`;
    await gcp(url, {
      method: "PATCH",
      body: { indexConfig: { indexes: f.indexes || [] } },
    }).catch(() => {
      /* Field overrides are an optimisation; a clinic works without them. */
    });
  }
}

// ---------------------------------------------------------------------------
// 3. bucket
// ---------------------------------------------------------------------------

async function stepBucket(ctx: ProvisionContext): Promise<void> {
  const p = projectId();
  const bucket = bucketName(ctx.label);
  const host = `https://${hostFor(ctx.label)}`;

  let exists = true;
  try {
    await gcp(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`);
  } catch (e) {
    if (e instanceof GcpError && e.status === 404) exists = false;
    else throw e;
  }

  if (!exists) {
    try {
      await gcp(`https://storage.googleapis.com/storage/v1/b?project=${p}`, {
        method: "POST",
        body: {
          name: bucket,
          location: "EU",
          // Uniform access: per-object ACLs and Firebase Storage rules together
          // are two authorisation systems disagreeing about the same file.
          iamConfiguration: { uniformBucketLevelAccess: { enabled: true } },
          cors: [
            {
              origin: [host],
              method: ["GET", "HEAD", "PUT", "POST", "DELETE"],
              responseHeader: ["Content-Type", "Authorization", "Content-Length", "User-Agent", "x-goog-resumable"],
              maxAgeSeconds: 3600,
            },
          ],
        },
      });
    } catch (e) {
      if (!(e instanceof GcpError) || e.status !== 409) throw e;
    }
  }

  // Registering with Firebase is what makes Storage RULES apply to this bucket.
  // Without it the bucket exists and the rules do not cover it — open or shut
  // depending on IAM, and either way not what the rules file says.
  await gcp(
    `https://firebasestorage.googleapis.com/v1beta/projects/${p}/buckets/${encodeURIComponent(bucket)}:addFirebase`,
    { method: "POST", body: {} },
  ).catch((e) => {
    if (!(e instanceof GcpError) || (e.status !== 409 && e.reason !== "ALREADY_EXISTS")) throw e;
  });

  const rulesetName = await createRuleset(p, "storage.rules", repoFile("storage.rules"));
  await release(p, `firebase.storage/${bucket}`, rulesetName);
}

// ---------------------------------------------------------------------------
// 4. seed
// ---------------------------------------------------------------------------

async function stepSeed(ctx: ProvisionContext): Promise<void> {
  const db = adminDb(databaseFor(ctx.label));
  const batch = db.batch();

  batch.set(db.collection("system_settings").doc("config"), configDoc(ctx.clinicName), { merge: true });
  for (const s of SERVICES) batch.set(db.collection("services").doc(s.id), s, { merge: true });
  for (const [id, title, description] of PROGRAMS) {
    batch.set(db.collection("programs").doc(id), { id, title, description }, { merge: true });
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// 5. register  (control plane, licence, authorised domain)
// ---------------------------------------------------------------------------

async function stepRegister(ctx: ProvisionContext): Promise<void> {
  const control = adminDb();
  const databaseId = databaseFor(ctx.label);
  const bucket = bucketName(ctx.label);

  await control
    .collection("tenants")
    .doc(ctx.label)
    .set(
      {
        tenantId: ctx.label,
        databaseId,
        bucket,
        name: ctx.clinicName,
        status: "active",
        isDemo: false,
        signupRef: ctx.signupRef,
        // Copied onto the tenant because the controller relationship lives
        // there: this clinic is the data controller for its children's records.
        dpa: ctx.dpa,
        updatedAt: new Date().toISOString(),
      },
      { merge: true },
    );

  // The licence, before anyone can use the clinic. A clinic with no licence is
  // UNRESTRICTED, not broken — licenceActive() fails open — so leaving this out
  // gives away every paid limit silently and forever.
  const licence = buildTrialLicence(ctx.tier, ACTOR);
  if ("error" in licence) throw new Error(`trial licence: ${licence.error}`);

  await control.collection("tenants").doc(ctx.label).set({ licence }, { merge: true });

  // Registry first, mirror second — the same order the console and
  // set-licences.mjs use. A failed mirror leaves the clinic working.
  const clinic = adminDb(databaseId);
  await clinic.collection("system_settings").doc("licence").set(licenceMirror(licence), { merge: true });
  await clinic
    .collection("system_settings")
    .doc("config")
    .set(configLimitsFor(ctx.tier), { merge: true });

  await ensureAuthorizedDomain(hostFor(ctx.label));
}

/**
 * Add the clinic's host to Firebase Auth's authorised domains.
 *
 * Project-wide rather than per clinic, and its absence breaks Google sign-in on
 * that host only — email and password keep working, and the failure surfaces in
 * the browser console where nobody is looking. Two live clinics ran for months
 * without it.
 */
async function ensureAuthorizedDomain(host: string): Promise<void> {
  const p = projectId();
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${p}/config`;
  const cfg = await gcp<{ authorizedDomains?: string[] }>(url);
  const list = cfg.authorizedDomains || [];
  if (list.includes(host)) return;
  await gcp(`${url}?updateMask=authorizedDomains`, {
    method: "PATCH",
    // Appends. Replacing the list would silently unauthorise every other clinic.
    body: { authorizedDomains: [...list, host] },
  });
}

// ---------------------------------------------------------------------------
// 6. hostname
// ---------------------------------------------------------------------------

async function stepHostname(ctx: ProvisionContext): Promise<void> {
  const token = (process.env.VERCEL_API_TOKEN || "").trim();
  const project = (process.env.VERCEL_PROJECT_ID || "").trim();
  // Named individually. "A or B is not set" sends whoever reads it to check
  // both, and the same ambiguity two layers down already cost a round of
  // debugging on this endpoint.
  const missing = [
    !token && "VERCEL_API_TOKEN",
    !project && "VERCEL_PROJECT_ID",
  ].filter(Boolean);
  if (missing.length) throw new Error(`${missing.join(" and ")} not set`);
  const team = (process.env.VERCEL_TEAM_ID || "").trim();
  const q = team ? `?teamId=${encodeURIComponent(team)}` : "";
  const host = hostFor(ctx.label);

  // *.tempoapp.ro already resolves to Vercel through the zone's wildcard CNAME.
  // What the wildcard cannot do is carry TLS — a wildcard certificate needs a
  // DNS-01 challenge and Vercel does not control this zone. Attaching the host
  // to the project is what lets Vercel complete an HTTP-01 challenge and issue
  // a certificate for this one name. Resolution and certificate are two
  // different mechanisms; only the second is ours to trigger.
  const res = await fetch(`https://api.vercel.com/v10/projects/${encodeURIComponent(project)}/domains${q}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: host }),
  });

  if (res.ok) return;
  const body = (await res.json().catch(() => ({}))) as { error?: { code?: string; message?: string } };
  // Already attached — from a retry, or from a hostname that outlived an
  // earlier clinic. Either way there is nothing to do.
  if (res.status === 409 || body.error?.code === "domain_already_in_use") return;
  throw new Error(`vercel: ${body.error?.message || res.status}`);
}

// ---------------------------------------------------------------------------
// 7. admin
// ---------------------------------------------------------------------------

async function stepAdmin(ctx: ProvisionContext): Promise<void> {
  const auth = adminAuth();
  const databaseId = databaseFor(ctx.label);
  const bucket = bucketName(ctx.label);

  // One Firebase Auth pool for the whole platform: one person, one account, one
  // password, possibly staff at several clinics. So an existing address is
  // reused rather than refused — somebody opening a second clinic is a customer,
  // not a collision.
  let uid: string;
  try {
    uid = (await auth.getUserByEmail(ctx.adminEmail)).uid;
  } catch {
    uid = (
      await auth.createUser({
        email: ctx.adminEmail,
        displayName: ctx.adminName,
        emailVerified: false,
      })
    ).uid;
  }

  const clinic = adminDb(databaseId);
  await clinic
    .collection("team_members")
    .doc(uid)
    .set(
      {
        uid,
        name: ctx.adminName,
        email: ctx.adminEmail,
        role: "Admin",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      { merge: true },
    );

  // The membership mirror, in the control plane. Storage rules cannot read a
  // named database, so this is the only thing that authorises the new Admin to
  // touch a document, a video or a voice note in their own clinic.
  await adminDb()
    .collection("tenant_members")
    .doc(`${bucket}__${uid}`)
    .set({ tenantId: ctx.label, role: "Admin" }, { merge: true });

  await sendAdminInvite(ctx);
}

/**
 * Let the new Admin in.
 *
 * The account is created with NO password — the same pattern `createTeamMember`
 * uses — so without this the clinic is complete, correct, and impossible to log
 * into. It would report `ready` with a URL the customer cannot get past.
 *
 * Uses Firebase's own reset email rather than a transactional email provider,
 * because there is no provider wired into this platform and `sendPasswordResetEmail`
 * is already how every other invite in the app works. Same mechanism, same
 * template, nothing new to configure.
 *
 * NON-FATAL, deliberately. A clinic that exists but whose welcome email bounced
 * is recoverable by the customer from the login page's own "forgot password" —
 * failing the whole provision over it would throw away a working clinic to
 * report a problem the customer can already solve. But it is recorded, because
 * silently not inviting somebody looks identical to inviting them.
 */
async function sendAdminInvite(ctx: ProvisionContext): Promise<void> {
  const key = (process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "").trim();
  const host = hostFor(ctx.label);

  let sent = false;
  let problem = "";
  try {
    if (!key) throw new Error("NEXT_PUBLIC_FIREBASE_API_KEY is not set");
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestType: "PASSWORD_RESET",
          email: ctx.adminEmail,
          // Land them on their OWN clinic afterwards, not the platform's default
          // auth domain. `register` added this host to the authorised domains
          // before this step runs, which is what makes the link legal.
          continueUrl: `https://${host}/login`,
        }),
      },
    );
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
    sent = true;
  } catch (e) {
    problem = String((e as Error)?.message || e).slice(0, 300);
    console.error(`[provision] invite to ${ctx.adminEmail} failed:`, problem);
  }

  await adminDb()
    .collection("provisions")
    .doc(ctx.provisionId)
    .set({ inviteSent: sent, inviteError: sent ? null : problem }, { merge: true })
    .catch(() => {
      /* Recording the outcome must never be what fails the clinic. */
    });
}

// ---------------------------------------------------------------------------

export const RUNNERS: Record<StepKey, (ctx: ProvisionContext) => Promise<void>> = {
  database: stepDatabase,
  rules: stepRules,
  bucket: stepBucket,
  seed: stepSeed,
  register: stepRegister,
  hostname: stepHostname,
  admin: stepAdmin,
};
