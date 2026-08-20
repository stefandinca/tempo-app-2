import type { Firestore } from "firebase-admin/firestore";
import { clinicDatabaseId } from "@/lib/platform/labels";

/**
 * How many documents a collection holds, via count() aggregation rather than
 * fetching them — Live Better Life has 88 clients and tens of thousands of
 * events, and the console only needs the number.
 *
 * A clinic whose database is unreachable counts as 0 rather than taking the
 * whole page down: the console's job is to show you the estate at a glance,
 * including the parts that are broken. The health screen is where an
 * unreachable clinic is reported as such.
 */
export async function countOf(db: Firestore, collection: string): Promise<number> {
  try {
    const snap = await db.collection(collection).count().get();
    return snap.data().count;
  } catch {
    return 0;
  }
}

/** Who a clinic is, as far as the console is concerned. */
export interface TenantIdentity {
  /** The registry document id — the clinic's label, e.g. `"aicaa"`. */
  tenantId: string;
  /** The database its records live in, e.g. `"clinic-aicaa"`. */
  databaseId: string;
  /** The hostname it is served at, e.g. `"aicaa.tempoapp.ro"`. */
  host: string;
}

/**
 * One clinic's identity, derived ONCE from its registry document, for every
 * route that needs it.
 *
 * Four routes used to each build this inline, and they disagreed in two ways
 * that matter:
 *
 *   - three of them wrote `` t.databaseId || `clinic-${doc.id}` ``, which
 *     skips `clinicDatabaseId()` entirely — so the one validator standing
 *     between a registry id and `adminDb()` applied in one place out of four.
 *     Here the derived value goes through it, and a document id that is not a
 *     well-formed clinic label yields `null` rather than a database name
 *     assembled from whatever the id happened to contain.
 *   - `host` was derived independently, from `doc.id`, while the counts beside
 *     it were read from `databaseId`. A registry document whose `databaseId`
 *     disagreed with its id would therefore show one clinic's hostname next to
 *     another clinic's numbers. Both now come from `databaseId`, so the
 *     hostname on screen always names the database the row was read from.
 *
 * The precedence is unchanged and deliberate: an explicit `databaseId` in the
 * registry wins over the derived one, because that field is how a clinic whose
 * database does not follow the `clinic-<label>` convention is onboarded at all.
 */
export function tenantIdentity(doc: {
  id: string;
  data: () => Record<string, unknown> | undefined;
}): TenantIdentity | null {
  const derived = clinicDatabaseId(doc.id);
  if (!derived) return null;

  const registered = doc.data()?.databaseId;
  const databaseId = typeof registered === "string" && registered ? registered : derived;

  // The label the host is built from comes from the database we will actually
  // read, not from the document id, so the two can never drift apart. For the
  // ordinary case — no `databaseId`, or one that matches — this is exactly the
  // value the routes produced before.
  const label = databaseId.startsWith("clinic-") ? databaseId.slice("clinic-".length) : doc.id;
  return { tenantId: doc.id, databaseId, host: `${label}.tempoapp.ro` };
}
