/**
 * Rewrites every string inside a Firestore document value.
 *
 * Walks the whole structure instead of a list of known field names, because the
 * things worth rewriting — a uid, a bucket name inside a download URL — turn up
 * in places nobody remembers: inside arrays (`therapistIds`, `parentUids`),
 * nested maps (`thumbnailUrl` under a video entry), and as MAP KEYS
 * (`threads.participantDetails` is keyed by uid).
 *
 * `fn` receives each string and returns its replacement.
 */
export function deepMapStrings(value, fn) {
  if (typeof value === "string") return fn(value);
  if (Array.isArray(value)) return value.map((v) => deepMapStrings(v, fn));
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[fn(k)] = deepMapStrings(v, fn);
    }
    return out;
  }
  return value;
}

/** True when a rewrite actually changed something. */
export const changed = (a, b) => JSON.stringify(a) !== JSON.stringify(b);

/** Every collection a clinic owns, as walked by the migration tools. */
export const TOP_LEVEL = [
  "clients", "team_members", "team_public", "events", "services", "programs",
  "invoices", "payouts", "expenses", "recurring_expenses", "activities",
  "threads", "notifications", "fcm_tokens", "system_settings", "client_codes",
  "user_consents", "user_ai_usage", "ai_conversations", "ai_usage_events",
  "evaluation_protocols", "potential_clients",
];

export const CLIENT_SUBS = [
  "evaluations", "vbmapp_evaluations", "portage_evaluations", "cars_evaluations",
  "carolina_evaluations", "interventionPlans", "homework", "documents", "videos",
  "voiceFeedback", "reports",
];

/**
 * Visits every document of a clinic's database, including subcollections, and
 * hands each one to `visit(path, doc)`.
 */
export async function walkClinic(db, visit) {
  for (const coll of TOP_LEVEL) {
    const docs = await db.listAll(coll).catch(() => []);
    for (const d of docs) await visit(coll, d);

    if (coll === "clients") {
      for (const c of docs) {
        for (const sub of CLIENT_SUBS) {
          const path = `clients/${c.__id}/${sub}`;
          for (const d of await db.listAll(path).catch(() => [])) await visit(path, d);
        }
      }
    }
    if (coll === "threads") {
      for (const t of docs) {
        const path = `threads/${t.__id}/messages`;
        for (const d of await db.listAll(path).catch(() => [])) await visit(path, d);
      }
    }
    if (coll === "ai_conversations") {
      for (const v of docs) {
        const path = `ai_conversations/${v.__id}/messages`;
        for (const d of await db.listAll(path).catch(() => [])) await visit(path, d);
      }
    }
  }
}
