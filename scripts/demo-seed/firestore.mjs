/**
 * Minimal Firestore REST client for the demo seeder, plus the environment guard.
 *
 * Authenticates with gcloud Application Default Credentials. Note that ADC is a
 * *personal* account credential and can reach the live project just as easily as
 * the demo one — so the credential is NOT the safety boundary. ALLOWED_PROJECT
 * below is, and it is checked again immediately before every write.
 */
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

/** The ONLY project this script may ever touch. Not a "not live" check — an allowlist. */
export const ALLOWED_PROJECT = "tempo-app-demo";
/** Named purely so an accidental match is impossible to misread in a log. */
const KNOWN_LIVE_PROJECT = "tempo-app-2";

let cachedToken = null;
let cachedAt = 0;

function token() {
  // ADC tokens last ~1h; re-mint every 30 min during long runs.
  if (cachedToken && Date.now() - cachedAt < 30 * 60 * 1000) return cachedToken;
  cachedToken = execSync("gcloud auth application-default print-access-token", {
    stdio: ["ignore", "pipe", "pipe"],
  }).toString().trim();
  cachedAt = Date.now();
  return cachedToken;
}

export function assertDemoProject(project) {
  if (project !== ALLOWED_PROJECT) {
    throw new Error(
      `REFUSING TO RUN. This script may only touch "${ALLOWED_PROJECT}", but the ` +
      `target project is "${project}".` +
      (project === KNOWN_LIVE_PROJECT
        ? " That is the LIVE clinic database — it holds real client records."
        : ""),
    );
  }
}

export class Db {
  /**
   * @param project Firebase project id.
   * @param opts.allowAnyProject Opt out of the demo allowlist. ONLY for tools
   *   that legitimately target arbitrary projects (tenant bootstrap). Callers
   *   that pass this take on the duty of guarding writes themselves — the demo
   *   seeder must never pass it.
   */
  constructor(project, { allowAnyProject = false, database = "(default)" } = {}) {
    if (!allowAnyProject) assertDemoProject(project);
    this.allowAnyProject = allowAnyProject;
    this.project = project;
    // Held as a field because reads AND writes must agree on it. Overriding
    // `base` alone used to leave commit() pointed at (default) — writes silently
    // landed in the wrong database while reads came from the right one.
    this.database = database;
    this.base = `https://firestore.googleapis.com/v1/projects/${project}/databases/${database}/documents`;
    this.writes = 0;
    this.dryRun = false;
  }

  headers(extra = {}) {
    return { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...extra };
  }

  async listAll(collectionPath) {
    const out = [];
    let pageToken = "";
    do {
      const u = new URL(`${this.base}/${collectionPath}`);
      u.searchParams.set("pageSize", "300");
      if (pageToken) u.searchParams.set("pageToken", pageToken);
      const r = await fetch(u, { headers: this.headers() });
      if (!r.ok) throw new Error(`list ${collectionPath}: ${r.status} ${await r.text()}`);
      const j = await r.json();
      out.push(...(j.documents || []).map(fromDoc));
      pageToken = j.nextPageToken || "";
    } while (pageToken);
    return out;
  }

  /**
   * Commit writes in chunks. Guard is re-asserted here — the last gate before
   * anything leaves the process.
   */
  async commit(writes) {
    if (!this.allowAnyProject) assertDemoProject(this.project);
    if (this.dryRun) { this.writes += writes.length; return; }
    for (let i = 0; i < writes.length; i += 400) {
      const chunk = writes.slice(i, i + 400);
      const r = await fetch(
        `https://firestore.googleapis.com/v1/projects/${this.project}/databases/${this.database}/documents:commit`,
        { method: "POST", headers: this.headers(), body: JSON.stringify({ writes: chunk }) },
      );
      if (!r.ok) throw new Error(`commit: ${r.status} ${(await r.text()).slice(0, 400)}`);
      this.writes += chunk.length;
    }
  }

  docName(pathStr) {
    return `projects/${this.project}/databases/${this.database}/documents/${pathStr}`;
  }

  /** Full overwrite of a document. */
  setWrite(pathStr, data) {
    return { update: { name: this.docName(pathStr), fields: toFields(data) } };
  }

  /** Merge — only the supplied fields are written. */
  mergeWrite(pathStr, data) {
    return {
      update: { name: this.docName(pathStr), fields: toFields(data) },
      updateMask: { fieldPaths: Object.keys(data) },
    };
  }

  deleteWrite(pathStr) {
    return { delete: this.docName(pathStr) };
  }
}

/* ---------- value encoding ---------- */

export function toValue(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(toValue) } };
  if (typeof v === "object") return { mapValue: { fields: toFields(v) } };
  return { stringValue: String(v) };
}

export function toFields(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    out[k] = toValue(v);
  }
  return out;
}

/**
 * Decode a REST field value.
 *
 * ⚠️ TIMESTAMPS DO NOT SURVIVE A ROUND TRIP THROUGH THIS PAIR OF FUNCTIONS.
 * A `timestampValue` decodes to a plain **string**, and `toValue` then encodes
 * a string as `stringValue` — only a `Date` becomes a `timestampValue` again.
 * So anything read and re-written by these helpers comes out the other side with
 * its Timestamps flattened to ISO strings.
 *
 * That already happened, at scale: the tenant migration copied every clinic
 * through here, which is why 298 of 300 activities, 44 of 44 threads and every
 * migrated event, invoice and document carry string timestamps today. Nothing
 * noticed, because ISO strings sort identically to timestamps — it surfaced only
 * on screen, where readers calling `.toDate()` either threw or silently fell
 * back. `src/lib/timestamps.ts` exists to absorb that, and the app now reads
 * both shapes.
 *
 * Left as-is deliberately: the data is already written, the readers tolerate
 * both, and changing the decoder would alter what every consuming script sees
 * for no benefit to records that already exist. If this is ever used to migrate
 * another clinic, return `new Date(f.timestampValue)` here first — `toValue`
 * already encodes a Date correctly — and re-check the scripts that call
 * `listAll`.
 */
export function fromValue(f) {
  if (f == null) return null;
  if ("nullValue" in f) return null;
  if ("stringValue" in f) return f.stringValue;
  if ("booleanValue" in f) return f.booleanValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("doubleValue" in f) return f.doubleValue;
  // Lossy on purpose — see the warning above before "fixing" this.
  if ("timestampValue" in f) return f.timestampValue;
  if ("arrayValue" in f) return (f.arrayValue.values || []).map(fromValue);
  if ("mapValue" in f) {
    return Object.fromEntries(Object.entries(f.mapValue.fields || {}).map(([k, v]) => [k, fromValue(v)]));
  }
  return null;
}

export function fromDoc(d) {
  const obj = Object.fromEntries(Object.entries(d.fields || {}).map(([k, v]) => [k, fromValue(v)]));
  obj.__id = d.name.split("/").pop();
  obj.__name = d.name;
  return obj;
}

/* ---------- backup ---------- */

export function writeBackup(rootDir, label, docs) {
  if (!docs.length) return null;
  mkdirSync(rootDir, { recursive: true });
  const file = path.join(rootDir, `${label}.json`);
  writeFileSync(file, JSON.stringify(docs, null, 1), "utf8");
  return file;
}
