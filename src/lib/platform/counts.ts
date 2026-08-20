import type { Firestore } from "firebase-admin/firestore";

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
