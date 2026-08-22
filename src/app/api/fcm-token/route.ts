/**
 * Registers this browser's push token, and takes ownership of it.
 *
 * WHY THIS IS NOT A CLIENT WRITE ANY MORE
 * An FCM token belongs to the BROWSER, not the account, so when a second
 * account signs in on the same device the same token gets written under a
 * second uid. Measured at one clinic: 47 registrations across 14 real devices,
 * one token held by 12 accounts. Because notification bodies name children, a
 * push meant for one recipient was delivered to whoever was using that browser.
 *
 * A browser cannot fix that itself — the rules stop one user deleting another
 * user's token document, and they should. It was a Firestore trigger, which
 * worked, but a v2 trigger binds to one database named at deploy time, so it
 * needed a registration per clinic and a functions deploy to onboard one. That
 * was the last thing in the onboarding path requiring a source edit.
 *
 * Doing it here removes that, and is simpler than the trigger was: one request
 * writes the registration and clears the older ones, so there is no window
 * where two accounts both own a token.
 *
 * THE INVARIANT: a token has exactly one owner, the account that most recently
 * registered it. That is the only model a single browser can support. A device
 * therefore receives notifications only for the account currently signed into
 * it — the alternative is one identity seeing another identity's notifications.
 */
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { tenantDatabaseFromRequest } from "@/lib/tenant";

export const runtime = "nodejs";

function bearer(req: NextRequest): string | null {
  const h = req.headers.get("authorization") || "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}

export async function POST(req: NextRequest) {
  const idToken = bearer(req);
  if (!idToken) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const databaseId = tenantDatabaseFromRequest(req);
  if (databaseId === "(default)") {
    return NextResponse.json({ error: "not_a_clinic_host" }, { status: 404 });
  }

  let body: { token?: unknown; platform?: unknown; userAgent?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const token = typeof body?.token === "string" ? body.token.trim() : "";
  // FCM tokens are long opaque strings. The bound is a sanity check against a
  // client sending something absurd, not a format assertion — Google has
  // changed their shape before and a strict pattern would break registration
  // for everyone the day they do it again.
  if (!token || token.length < 20 || token.length > 4096) {
    return NextResponse.json({ error: "invalid_token_value" }, { status: 400 });
  }

  const db = adminDb(databaseId);

  // Anyone signed in may register their OWN device: staff, and anonymous
  // parents, who are the majority of registrations. There is nothing to
  // authorise beyond identity — the uid comes from the verified token and the
  // document is keyed by it, so a caller can only ever claim their own.
  try {
    const now = new Date();
    await db.collection("fcm_tokens").doc(uid).set(
      {
        token,
        userId: uid,
        platform: typeof body.platform === "string" ? body.platform : "web",
        userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 512) : "",
        updatedAt: now,
      },
      { merge: true },
    );

    // Then take ownership: drop every OTHER account holding this same token.
    //
    // Only older ones, never "everyone except me". Two accounts signing in
    // close together used to give two concurrent trigger invocations, and a
    // cold start could delay the first past the second, so each deleted the
    // other and the token ended up owned by nobody — observed in testing. That
    // race is gone now this is one request, but the ordering is kept: a second
    // browser registering the same token milliseconds later must still win
    // rather than annihilate.
    const holders = await db.collection("fcm_tokens").where("token", "==", token).get();
    const stale = holders.docs.filter((d) => {
      if (d.id === uid) return false;
      const v = d.data()?.updatedAt ?? d.data()?.createdAt;
      const theirs = v && typeof v.toMillis === "function" ? v.toMillis() : 0;
      // Equal timestamps mean a genuine tie; break it on document id so exactly
      // one of the pair survives.
      return theirs === now.getTime() ? d.id < uid : theirs < now.getTime();
    });

    if (stale.length) {
      const batch = db.batch();
      stale.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    return NextResponse.json({ ok: true, released: stale.length });
  } catch (e: unknown) {
    console.error("[fcm-token] failed:", (e as Error)?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

/** Clears this account's registration — used on sign-out. */
export async function DELETE(req: NextRequest) {
  const idToken = bearer(req);
  if (!idToken) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  let uid: string;
  try {
    uid = (await adminAuth().verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const databaseId = tenantDatabaseFromRequest(req);
  if (databaseId === "(default)") {
    return NextResponse.json({ error: "not_a_clinic_host" }, { status: 404 });
  }

  try {
    await adminDb(databaseId).collection("fcm_tokens").doc(uid).delete();
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    console.error("[fcm-token] delete failed:", (e as Error)?.message);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
