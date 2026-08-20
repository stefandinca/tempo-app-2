/**
 * Reading a timestamp field, whatever shape it happens to be in.
 *
 * Firestore timestamp fields in this database hold TWO different types, and
 * which one you get depends on when the document was written:
 *
 *   - Anything written by the app carries a real `Timestamp` (`serverTimestamp()`).
 *   - Almost everything older carries an ISO **string**, because the tenant
 *     migration round-tripped every document through the Firestore REST API and
 *     its decoder turns `timestampValue` into a plain string. Re-encoding then
 *     stored it as `stringValue`. That is why 298 of 300 activities, 44 of 44
 *     threads and every migrated event carry strings.
 *
 * So a reader that assumes `Timestamp` is wrong for most of the data, and the
 * two ways of getting it wrong both shipped:
 *
 *   `value?.toDate()`        throws on a string — `?.` guards the FIELD being
 *                            absent, not the method being missing. This crashed
 *                            the whole Messages page.
 *   `value?.toDate?.() || X` silently falls back to X. Where X was
 *                            `new Date()`, every activity in the audit trail
 *                            rendered as having happened just now.
 *
 * Sorting is unaffected either way — ISO strings sort lexicographically in the
 * same order as timestamps — which is why this stayed invisible in queries and
 * only showed up on screen.
 *
 * Prefer these helpers to touching `.toDate()` directly.
 */

/** Every shape a timestamp field in this database has ever held. */
export type FirestoreDateLike =
  | { toDate: () => Date }
  | string
  | number
  | Date
  | null
  | undefined;

/** A `Date`, or null when the value is absent or unparseable. Never throws. */
export function toDateOrNull(value: FirestoreDateLike): Date | null {
  if (value === null || value === undefined) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  // A Firestore Timestamp — duck-typed, because the client and admin SDKs each
  // have their own class and this runs against both.
  if (typeof value === "object" && typeof (value as { toDate?: unknown }).toDate === "function") {
    try {
      const d = (value as { toDate: () => Date }).toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  return null;
}

/** An ISO string, or null. */
export function toISO(value: FirestoreDateLike): string | null {
  return toDateOrNull(value)?.toISOString() ?? null;
}

/**
 * Milliseconds since the epoch, or null — for sorting and comparing without
 * caring which shape the field is in.
 */
export function toMillis(value: FirestoreDateLike): number | null {
  return toDateOrNull(value)?.getTime() ?? null;
}
