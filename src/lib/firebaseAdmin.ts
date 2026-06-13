// Server-only Firebase Admin init. Used EXCLUSIVELY by API routes to verify
// Firebase ID tokens and read gating data (role/consent/usage) with rule-bypass.
// Never import this from a client component.
import { cert, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

export type ServiceAccountSource = "json" | "base64";

interface LoadedServiceAccount {
  sa: ServiceAccount & { project_id?: string; client_email?: string; private_key?: string };
  source: ServiceAccountSource;
}

/**
 * Parse FIREBASE_SERVICE_ACCOUNT. Accepts either the raw service-account JSON or
 * a base64-encoding of it. Base64 is the recommended form for env-var UIs (e.g.
 * Vercel) because it carries the PEM private key's newlines without any escaping
 * pitfalls — the #1 cause of "verifyIdToken works but Firestore 500s".
 */
export function loadServiceAccount(): LoadedServiceAccount {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw || !raw.trim()) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set");
  }
  let text = raw.trim();
  let source: ServiceAccountSource = "json";

  // If it doesn't look like JSON, try base64-decoding it.
  if (!text.startsWith("{")) {
    try {
      const decoded = Buffer.from(text, "base64").toString("utf8").trim();
      if (decoded.startsWith("{")) {
        text = decoded;
        source = "base64";
      }
    } catch {
      /* fall through to the JSON.parse error below */
    }
  }

  let sa: LoadedServiceAccount["sa"];
  try {
    sa = JSON.parse(text);
  } catch (e: any) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT is not valid JSON (or base64-encoded JSON): " + (e?.message || e),
    );
  }

  // Service-account JSON pasted into an env var often has escaped newlines.
  if (sa.private_key) sa.private_key = String(sa.private_key).replace(/\\n/g, "\n");

  const missing = ["project_id", "client_email", "private_key"].filter((k) => !(sa as any)[k]);
  if (missing.length) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT is missing required field(s): " + missing.join(", "));
  }
  return { sa, source };
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];
  const { sa } = loadServiceAccount();
  return initializeApp({ credential: cert(sa as ServiceAccount) });
}

export const adminAuth = () => getAuth(getAdminApp());
export const adminDb = () => getFirestore(getAdminApp());
