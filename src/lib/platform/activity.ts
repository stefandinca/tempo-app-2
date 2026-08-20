/**
 * Records a platform-side change in the CLINIC's own activity feed.
 *
 * A clinic's audit trail is a compliance artefact. When we change what they
 * bought, or their branding, or their licence, that has to show up there —
 * attributed to a named person — rather than appearing to have happened by
 * itself. `src/lib/activityService.ts` does the same job from inside a clinic;
 * this is its Admin-SDK counterpart, because the platform console is bound to
 * the control-plane database and cannot write a clinic's collections directly.
 *
 * Never throws. A failed audit write must not fail the change the operator
 * asked for — but it is logged loudly, because a silent gap in an audit trail
 * is worse than a noisy one.
 */
import { adminDb } from "@/lib/firebaseAdmin";

export interface PlatformActivityEntry {
  /** e.g. "licence_updated", "evaluation_access_updated", "branding_updated" */
  type: string;
  targetName: string;
  caller: { uid: string; name: string };
  metadata?: Record<string, unknown>;
}

export async function logPlatformActivity(
  databaseId: string,
  entry: PlatformActivityEntry,
): Promise<void> {
  try {
    await adminDb(databaseId).collection("activities").add({
      type: entry.type,
      // The clinic's own feed filters by category; "system" keeps platform
      // actions distinguishable from a therapist's or an admin's.
      category: "system",
      // Attribute the change to the PLATFORM, not the operator.
      //
      // The clinic is deliberately never shown that a Superadmin account exists
      // (see src/lib/roles.ts). If we record userId: operator.uid here, the
      // entry gets filtered by hiddenStaffIds in src/app/(dashboard)/activity/page.tsx
      // and disappears from the very audit trail it exists to populate.
      //
      // From the clinic's perspective, the actor is genuinely TempoApp-the-vendor
      // anyway. The operator's identity goes into metadata for our own forensics.
      userId: "platform",
      userName: "TempoApp",
      userPhotoURL: null,
      targetId: "platform",
      targetName: entry.targetName,
      metadata: {
        ...(entry.metadata || {}),
        viaPlatformConsole: true,
        operatorUid: entry.caller.uid,
      },
      createdAt: new Date().toISOString(),
    });
  } catch (e: any) {
    console.error(
      `[platform/activity] could not log ${entry.type} to ${databaseId}:`,
      String(e?.message || e),
    );
  }
}
