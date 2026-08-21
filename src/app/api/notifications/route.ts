/**
 * Creates notifications and sends their push, in one request.
 *
 * WHY THIS EXISTS
 * Push used to be sent by a Firestore trigger, and a v2 Firestore trigger binds
 * to exactly ONE database, named at deploy time. Under one database per clinic
 * that means a pair of function registrations per clinic and a
 * `firebase deploy --only functions` to onboard one — the single thing in the
 * whole onboarding path that needs a source edit, and the reason a clinic
 * cannot provision itself. See
 * docs/superpowers/specs/2026-08-22-self-onboarding-roadmap.md.
 *
 * It also removes a documented silent failure: forgetting the registration left
 * in-app notifications working and only push missing, which reads as users
 * having declined notifications rather than as a deployment gap.
 *
 * WHY CREATION MOVED HERE TOO, RATHER THAN JUST THE SEND
 * If the client wrote the document and then called a send endpoint, a browser
 * that dies between the two leaves a notification nobody is told about — the
 * same silent gap in a new place. Writing and sending in one request closes it.
 * It also means the notification document is written by the Admin SDK, so the
 * permissive client-side create rule can be tightened later.
 *
 * WHAT IS DELIBERATELY NOT GUARANTEED
 * A Firestore trigger retries; an HTTP request does not. A notification whose
 * push fails is still created, and is stamped with `pushedAt: null` so a sweeper
 * can find it. Delivery was never guaranteed anyway — FCM is best effort and a
 * device may be offline — but the failure mode moves from "retried by Google"
 * to "visible in a field", which is worth knowing.
 */
import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb, adminMessaging } from "@/lib/firebaseAdmin";
import { tenantDatabaseFromRequest } from "@/lib/tenant";

export const runtime = "nodejs";

/** The fields a caller may set. Anything else is ignored rather than stored. */
interface IncomingNotification {
  recipientId: string;
  recipientRole: string;
  clientId?: string;
  type: string;
  category: string;
  title: string;
  message: string;
  sourceType: string;
  sourceId?: string;
  triggeredBy?: string;
  actions?: { label: string; type: string; route?: string }[];
  groupKey?: string;
}

const MAX_BATCH = 50;

function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function POST(req: NextRequest) {
  const token = bearer(req);
  if (!token) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(token)).uid;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  // Which clinic, from the Host header. The browser is served from
  // <label>.tempoapp.ro, so this is the same derivation the app itself uses and
  // there is nothing for the caller to choose.
  const databaseId = tenantDatabaseFromRequest(req);
  if (databaseId === "(default)") {
    return NextResponse.json({ error: "not_a_clinic_host" }, { status: 404 });
  }
  const db = adminDb(databaseId);

  let body: { notifications?: IncomingNotification[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const incoming = Array.isArray(body?.notifications) ? body.notifications : [];
  if (!incoming.length) return NextResponse.json({ error: "no_notifications" }, { status: 400 });
  if (incoming.length > MAX_BATCH) {
    return NextResponse.json({ error: "too_many", max: MAX_BATCH }, { status: 400 });
  }

  // Who is asking. Staff may notify anyone in their clinic; a parent may only
  // notify about a child they are actually linked to. Without the second check
  // any anonymous session could push arbitrary text naming any child.
  const memberSnap = await db.collection("team_members").doc(uid).get();
  const memberRole = String(memberSnap.data()?.role || "").toLowerCase();
  // Superadmin is exempt from the isActive check, exactly as in
  // src/lib/serverAuth.ts and in firestore.rules. A live clinic's platform
  // account carries isActive: false — it is how that account stays out of the
  // clinic's own roster — so treating the flag as authoritative here locks the
  // platform out of the largest clinic. This route was written without the
  // exemption and failed on the first real call.
  const isStaff =
    memberSnap.exists &&
    (memberRole === "superadmin" || String(memberSnap.data()?.isActive) !== "false");

  let parentClientIds: string[] = [];
  if (!isStaff) {
    const linked = await db.collection("clients").where("parentUids", "array-contains", uid).get();
    parentClientIds = linked.docs.map((d) => d.id);
    if (!parentClientIds.length) {
      return NextResponse.json({ error: "not_authorised" }, { status: 403 });
    }
  }

  const required = ["recipientId", "type", "category", "title", "message", "sourceType"] as const;
  const results: { id: string | null; pushed: boolean; error?: string }[] = [];

  for (const n of incoming) {
    if (required.some((k) => !n?.[k] || typeof n[k] !== "string")) {
      results.push({ id: null, pushed: false, error: "missing_fields" });
      continue;
    }
    if (!isStaff) {
      // A parent's notification is allowed two shapes, and the difference is
      // load-bearing rather than incidental.
      //
      // WITH a clientId, it must be one of their own children — that field is
      // what makes a notification visible to parents (they query by clientId),
      // so accepting someone else's would show one family another family's
      // notifications.
      //
      // WITHOUT one, the recipient must be staff at this clinic. That is the
      // chat case: a parent messaging their therapist produces a notification
      // that deliberately carries NO clientId, precisely so it does not surface
      // in the parent portal (see the comment in useChat.ts). Requiring a
      // clientId here would have rejected every parent-to-staff message
      // silently, and checking the recipient is staff is what stops the same
      // opening being used to notify another parent.
      const ok = n.clientId
        ? parentClientIds.includes(n.clientId)
        : (await db.collection("team_members").doc(n.recipientId).get()).exists;
      if (!ok) {
        results.push({ id: null, pushed: false, error: "not_authorised" });
        continue;
      }
    }

    // Built field by field: whatever the caller sent beyond this is dropped
    // rather than persisted, and `triggeredBy` is the verified uid rather than
    // a value from the body.
    const doc: Record<string, unknown> = {
      recipientId: n.recipientId,
      recipientRole: n.recipientRole || "",
      type: n.type,
      category: n.category,
      title: n.title,
      message: n.message,
      sourceType: n.sourceType,
      triggeredBy: uid,
      createdAt: new Date(),
      read: false,
      pushedAt: null,
      // Tells the Firestore trigger this document has already been pushed from
      // here, so the two paths can run side by side during the cutover without
      // sending everything twice. Set at CREATION rather than after the send,
      // because the trigger fires on create and would otherwise race the stamp.
      // Removed once the triggers are gone.
      pushVia: "api",
    };
    if (n.clientId) doc.clientId = n.clientId;
    if (n.sourceId) doc.sourceId = n.sourceId;
    if (n.groupKey) doc.groupKey = n.groupKey;
    if (Array.isArray(n.actions)) doc.actions = n.actions;

    let ref;
    try {
      ref = await db.collection("notifications").add(doc);
    } catch (e: unknown) {
      results.push({ id: null, pushed: false, error: "write_failed" });
      console.error("[notifications] write failed:", (e as Error)?.message);
      continue;
    }

    // Push is best effort and must never fail the request: the notification
    // exists and the in-app bell will show it regardless.
    let pushed = false;
    try {
      const tokenSnap = await db.collection("fcm_tokens").doc(n.recipientId).get();
      const fcmToken = tokenSnap.exists ? (tokenSnap.data()?.token as string | undefined) : undefined;
      if (fcmToken) {
        // Data-only, exactly as the trigger sent it: a `notification` block
        // would make the browser draw its own on top of the service worker's.
        await adminMessaging().send({
          token: fcmToken,
          data: {
            title: n.title,
            body: n.message,
            url: n.actions?.[0]?.route || "/parent/dashboard",
            notificationId: ref.id,
            type: n.type,
            category: n.category,
          },
          webpush: { headers: { Urgency: "high" } },
          android: { priority: "high" },
        });
        pushed = true;
        await ref.update({ pushedAt: new Date() });
      }
    } catch (e: unknown) {
      const code = (e as { code?: string })?.code;
      // FCM disowns a dead registration; drop it so it is not retried forever.
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        await db.collection("fcm_tokens").doc(n.recipientId).delete().catch(() => {});
      }
      console.error("[notifications] push failed:", (e as Error)?.message);
    }

    results.push({ id: ref.id, pushed });
  }

  return NextResponse.json({ results });
}
