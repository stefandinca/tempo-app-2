import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { resolveDatabaseId, DEFAULT_DATABASE_ID } from "@/lib/tenant";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Global flag to check if we are in demo mode
export const IS_DEMO = process.env.NEXT_PUBLIC_APP_ENV === 'demo';

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
export const ACTIVE_DATABASE_ID =
  typeof window !== "undefined"
    ? resolveDatabaseId(window.location.hostname)
    : DEFAULT_DATABASE_ID;

export const db =
  ACTIVE_DATABASE_ID === DEFAULT_DATABASE_ID
    ? getFirestore(app)
    : getFirestore(app, ACTIVE_DATABASE_ID);
export const storage = getStorage(app);


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