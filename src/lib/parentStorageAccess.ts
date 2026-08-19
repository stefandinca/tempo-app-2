/**
 * Keeps a parent's Storage-bucket mirror in step with their anonymous session.
 *
 * Firestore access is granted by `clients/{id}.parentUids`, which the portal
 * writes directly. Storage cannot use that list at all: its rules can only read
 * the `(default)` database, and the clinic's clients live in a named one. The
 * server keeps a small mirror in `(default)` instead — see
 * `src/app/api/parent/storage-access/route.ts`, which derives it rather than
 * accepting it, so nothing here is trusted.
 *
 * Anonymous uids are per-device and per-session, so this runs on every portal
 * login rather than once. Failures are logged and swallowed: the portal still
 * works without media, and blocking sign-in on a media permission would be a
 * worse outcome than a missing video.
 */
import type { User } from "firebase/auth";

const ENDPOINT = "/api/parent/storage-access";

async function call(user: User, method: "POST" | "DELETE"): Promise<boolean> {
  try {
    const res = await fetch(ENDPOINT, {
      method,
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
    if (!res.ok) {
      console.warn(`[ParentStorage] ${method} returned ${res.status}; media may not load`);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[ParentStorage] ${method} failed; media may not load`, err);
    return false;
  }
}

/** Call after this uid has been added to a client's `parentUids`. */
export const grantStorageAccess = (user: User) => call(user, "POST");

/** Call before signing out, while the token is still valid. */
export const revokeStorageAccess = (user: User) => call(user, "DELETE");
