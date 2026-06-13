// Server-only Firebase Admin init. Used EXCLUSIVELY by API routes to verify
// Firebase ID tokens and read gating data (role/consent/usage) with rule-bypass.
// Never import this from a client component.
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  }
  const sa = JSON.parse(raw) as ServiceAccount & { private_key?: string };
  // Service-account JSON pasted into an env var often has escaped newlines.
  if (sa.private_key) sa.private_key = sa.private_key.replace(/\\n/g, "\n");

  return initializeApp({ credential: cert(sa) });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
