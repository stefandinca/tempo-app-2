/**
 * Who counts as clinic staff, and who is platform-only.
 *
 * The Superadmin administers the platform; they are not a therapist, do not see
 * clients, and must not appear anywhere a clinic's own staff are listed — team
 * pickers, calendar filters, rosters, the activity feed. A clinic paying for
 * TempoApp should have no idea the account exists.
 *
 * This is presentation, not authorisation: the Superadmin's access is enforced
 * by Firestore rules, and their actions are still written to the audit trail.
 * Hiding them from a clinic's own views does not hide them from an audit.
 */

/** Case-insensitive, because roles are stored inconsistently across tenants. */
export function isSuperadminRole(role: unknown): boolean {
  return String(role || "").toLowerCase() === "superadmin";
}

/** True for a team member who should never be shown to a clinic. */
export function isPlatformStaff(member: { role?: unknown } | null | undefined): boolean {
  return isSuperadminRole(member?.role);
}
