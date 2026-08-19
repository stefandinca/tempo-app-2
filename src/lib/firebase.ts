import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { resolveDatabaseId, resolveStorageBucket, isDemoHost, DEFAULT_DATABASE_ID } from "@/lib/tenant";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};


// Initialize Firebase (Singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
/**
 * Which Firestore database this session talks to, derived from the hostname.
 * Known synchronously so the `db` singleton below can be created here — every
 * consumer imports it and none of them should have to know about tenancy.
 *
 * On the server (SSR / prerender) there is no hostname; those paths do not read
 * tenant data, and API routes resolve the database explicitly per request
 * instead (see tenantDatabaseFromRequest).
 */
const ACTIVE_HOSTNAME =
  // A dev server answers on localhost, which resolves to the control plane and
  // therefore shows an empty app. Setting this pretends to be a tenant host, so
  // a clinic's database and bucket can be exercised locally.
  process.env.NEXT_PUBLIC_TENANT_HOST ||
  (typeof window !== "undefined" ? window.location.hostname : "");

export const ACTIVE_DATABASE_ID = resolveDatabaseId(ACTIVE_HOSTNAME);

/**
 * Demo mode: hides billing, and answers Mira from a script rather than the API.
 *
 * Derived from the host rather than from NEXT_PUBLIC_APP_ENV because one
 * deployment now serves every clinic — a build-time flag would make every
 * clinic a demo, or none. The env var is still honoured so a preview deploy or
 * a local run can force it.
 *
 * There is no hostname during prerender, so this is false in the server-rendered
 * HTML. That is safe only because every consumer renders behind a client-side
 * gate — the login page returns a spinner while auth resolves, and the dashboard
 * components mount after it. Rendering IS_DEMO in markup that ships from the
 * server would hydrate into different content on the demo host.
 */
export const IS_DEMO =
  process.env.NEXT_PUBLIC_APP_ENV === "demo" || isDemoHost(ACTIVE_HOSTNAME);

export const db =
  ACTIVE_DATABASE_ID === DEFAULT_DATABASE_ID
    ? getFirestore(app)
    : getFirestore(app, ACTIVE_DATABASE_ID);

/**
 * Media is split the same way, but by bucket rather than by database: Storage
 * rules can only read the `(default)` Firestore database, so the bucket name
 * itself is the tenant key those rules compare against.
 */
export const ACTIVE_STORAGE_BUCKET = resolveStorageBucket(
  ACTIVE_HOSTNAME,
  firebaseConfig.storageBucket || "",
);

export const storage = ACTIVE_STORAGE_BUCKET
  ? getStorage(app, `gs://${ACTIVE_STORAGE_BUCKET}`)
  : getStorage(app);


// Messaging export with safety wrapper
export const messaging = typeof window !== "undefined" 
  ? (() => {
      try {
        return getMessaging(app);
      } catch (e) {
        console.warn("Firebase Messaging not supported in this environment:", e);
        return null;
      }
    })()
  : null;

export default app;