import { db } from "@/lib/firebase";
import { doc, writeBatch, deleteDoc } from "firebase/firestore";

/**
 * Keeps the /client_codes/{CODE} lookup collection in sync with /clients
 * so parents can resolve their access code without listing /clients.
 *
 * The doc ID is the uppercased access code, and the document contains only
 * what the parent login needs before authentication: { clientId, clientName }.
 */

export async function setClientCode(
  clientId: string,
  clientName: string,
  oldCode: string | null | undefined,
  newCode: string
): Promise<void> {
  const upperNew = newCode.toUpperCase();
  const upperOld = oldCode ? oldCode.toUpperCase() : null;

  const batch = writeBatch(db);

  // Write /clients update for the new code
  batch.update(doc(db, "clients", clientId), { clientCode: upperNew });

  // Write the lookup doc at the new code
  batch.set(doc(db, "client_codes", upperNew), {
    clientId,
    clientName,
  });

  // Remove the stale lookup doc if the code changed
  if (upperOld && upperOld !== upperNew) {
    batch.delete(doc(db, "client_codes", upperOld));
  }

  await batch.commit();
}

export async function removeClientCode(code: string | null | undefined): Promise<void> {
  if (!code) return;
  try {
    await deleteDoc(doc(db, "client_codes", code.toUpperCase()));
  } catch (err) {
    // Non-critical: if the lookup doc was already missing, we don't care.
    console.warn("[clientCodeSync] removeClientCode failed:", err);
  }
}
