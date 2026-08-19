import { db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

/**
 * Keeps the /team_public/{uid} mirror in sync with /team_members.
 *
 * Why a mirror: the parent portal legitimately needs a therapist's display
 * details — name, initials, colour — on the calendar, dashboard, homework and
 * profile screens. It used to get them by reading /team_members directly, which
 * was `allow read: if isSignedIn()`. Anonymous auth backs the parent portal, so
 * ANY visitor could list the whole staff roster including e-mail addresses,
 * phone numbers and salaries.
 *
 * Firestore rules grant or deny a whole document — they cannot hide fields — so
 * restricting the collection is only possible if the handful of fields parents
 * need live somewhere else. Same shape as clientCodeSync, which solves the
 * identical problem for access codes.
 *
 * NOTHING sensitive belongs in this document. Adding a field here exposes it to
 * every anonymous session.
 */

export interface TeamPublicFields {
  name: string;
  initials: string;
  color: string;
  role: string;
}

/** Derive the mirror payload, dropping everything parents must not see. */
export function toTeamPublic(member: any): TeamPublicFields {
  const name = String(member?.name || "");
  return {
    name,
    initials:
      member?.initials ||
      name.trim().split(/\s+/).map((w: string) => w[0]?.toUpperCase() || "").join("").slice(0, 2),
    color: member?.color || "#9CA3AF",
    role: String(member?.role || ""),
  };
}

export async function syncTeamPublic(uid: string, member: any): Promise<void> {
  try {
    await setDoc(doc(db, "team_public", uid), toTeamPublic(member));
  } catch (err) {
    // Non-fatal: the staff record is the source of truth. A stale mirror shows a
    // parent an out-of-date therapist name, which is preferable to failing the
    // staff-facing save.
    console.warn("[teamPublicSync] sync failed:", err);
  }
}

export async function removeTeamPublic(uid: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "team_public", uid));
  } catch (err) {
    console.warn("[teamPublicSync] remove failed:", err);
  }
}
