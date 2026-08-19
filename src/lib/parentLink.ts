/**
 * Client half of the parent portal's session linking.
 *
 * The portal used to write its own uid into `clients/{id}.parentUids` directly.
 * That made a guessable client id sufficient to reach a child's records, so the
 * write moved to `src/app/api/parent/link/route.ts`, which resolves the child
 * from the access code instead. The same call keeps the Storage mirror in step —
 * Storage rules cannot read a clinic's database, so parents need a mirror in
 * `(default)` to load videos, documents and voice notes at all.
 *
 * Anonymous uids are per-device and per-session, so `linkParent` runs on every
 * portal login rather than once.
 */
import type { User } from "firebase/auth";

// Trailing slash is required: next.config.js sets trailingSlash: true, so the
// bare path answers 308 and every call pays an extra round trip.

export interface LinkResult {
  clientId: string;
  clientName: string;
}

/**
 * Links this session to the child the access code belongs to.
 *
 * `previousUid` is the uid this device used last, so the server can drop it and
 * stop each client's `parentUids` accumulating a dead entry per session.
 *
 * Throws on failure. Unlike the Storage mirror, this IS the parent's access —
 * swallowing the error would leave them signed in and staring at an empty portal
 * with nothing to explain it.
 */
export async function linkParent(
  user: User,
  code: string,
  previousUid?: string | null,
): Promise<LinkResult> {
  const res = await fetch("/api/parent/link/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await user.getIdToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code, previousUid: previousUid || undefined }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: "" }));
    throw new Error(error || `link failed (${res.status})`);
  }
  return res.json();
}

/**
 * Unlinks this session on sign-out, so a shared device leaves nothing behind.
 * Best-effort: a failure here must not prevent someone signing out.
 */
export async function unlinkParent(user: User): Promise<void> {
  try {
    await fetch("/api/parent/link/", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
    });
  } catch (err) {
    console.warn("[ParentLink] unlink failed", err);
  }
}
