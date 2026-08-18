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
  constructor(project) {
    assertDemoProject(project);
    this.project = project;
    this.base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
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
    assertDemoProject(this.project);
    if (this.dryRun) { this.writes += writes.length; return; }
    for (let i = 0; i < writes.length; i += 400) {
      const chunk = writes.slice(i, i + 400);
      const r = await fetch(
        `https://firestore.googleapis.com/v1/projects/${this.project}/databases/(default)/documents:commit`,
        { method: "POST", headers: this.headers(), body: JSON.stringify({ writes: chunk }) },
      );
      if (!r.ok) throw new Error(`commit: ${r.status} ${(await r.text()).slice(0, 400)}`);
      this.writes += chunk.length;
    }
  }

  docName(pathStr) {
    return `projects/${this.project}/databases/(default)/documents/${pathStr}`;
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

export function fromValue(f) {
  if (f == null) return null;
  if ("nullValue" in f) return null;
  if ("stringValue" in f) return f.stringValue;
  if ("booleanValue" in f) return f.booleanValue;
  if ("integerValue" in f) return Number(f.integerValue);
  if ("doubleValue" in f) return f.doubleValue;
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
