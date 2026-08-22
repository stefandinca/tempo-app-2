/**
 * Google Cloud REST access for provisioning, using the platform service account.
 *
 * The Admin SDK covers Firestore documents and Auth users. It does not cover
 * *creating* a database, deploying rules, or making a Storage bucket — those are
 * control-plane APIs with no SDK surface here, so provisioning talks to them
 * directly.
 *
 * WHAT THIS SERVICE ACCOUNT CAN DO, AND WHY THAT IS NOT ALARMING
 * `firebase-adminsdk-fbsvc` already holds read, write and delete on every entity
 * in every clinic database, and can already rewrite the security rules of all of
 * them. A narrow custom role (`tempoProvisioner`) adds `databases.create` and
 * `indexes.create` — deliberately NOT `databases.delete` or `databases.update`.
 * Creating an empty database is strictly less dangerous than powers it has held
 * all along; deleting one is not, so it cannot.
 */
import { JWT } from "google-auth-library";
import { loadServiceAccount } from "@/lib/firebaseAdmin";

const SCOPE = "https://www.googleapis.com/auth/cloud-platform";

let client: JWT | null = null;

function jwt(): JWT {
  if (client) return client;
  const { sa } = loadServiceAccount();
  client = new JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: [SCOPE],
  });
  return client;
}

/** The project every clinic lives in. Read from the service account so it can
 *  never disagree with the credential actually being used. */
export function projectId(): string {
  const { sa } = loadServiceAccount();
  return String(sa.project_id);
}

export async function accessToken(): Promise<string> {
  const res = await jwt().getAccessToken();
  const token = typeof res === "string" ? res : res?.token;
  if (!token) throw new Error("could not mint a Google access token");
  return token;
}

export class GcpError extends Error {
  status: number;
  /** Google's own status string — RESOURCE_EXHAUSTED, ALREADY_EXISTS, … */
  reason: string;
  constructor(message: string, status: number, reason: string) {
    super(message);
    this.status = status;
    this.reason = reason;
  }
}

/**
 * One Google API call.
 *
 * Errors carry Google's status string as well as the HTTP code, because the
 * difference between "this already exists" and "you are out of quota" decides
 * whether provisioning continues, retries, or pages somebody — and both arrive
 * as a 409 or a 429 that tells you nothing on its own.
 */
export async function gcp<T = unknown>(
  url: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const token = await accessToken();
  const res = await fetch(url, {
    method: init.method || "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : {};
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const err = (parsed as { error?: { message?: string; status?: string } }).error;
    // The call is named in the message. "The caller does not have permission"
    // is true of a dozen different calls in a provisioning step, and without
    // knowing which one it is a guessing game about which permission to grant.
    const where = `${init.method || "GET"} ${new URL(url).host}${new URL(url).pathname}`;
    throw new GcpError(
      `${where}: ${err?.message || text.slice(0, 200) || res.statusText}`,
      res.status,
      err?.status || "",
    );
  }
  return parsed as T;
}

/** Google's long-running operation envelope. */
interface Operation {
  name?: string;
  done?: boolean;
  error?: { message?: string; code?: number };
}

/**
 * Wait for a long-running operation, within one request's budget.
 *
 * Creating a Firestore database is not instant, and the create call returns an
 * operation rather than a database. This polls for a bounded time and then
 * gives up WITHOUT failing the step — the caller re-checks existence on the next
 * pass instead. A slow database is not a broken one, and marking the provision
 * failed because we ran out of patience would strand a clinic that was seconds
 * from existing.
 *
 * Returns true if the operation finished, false if it is still running.
 */
export async function awaitOperation(name: string, budgetMs = 20_000): Promise<boolean> {
  const deadline = Date.now() + budgetMs;
  let delay = 1_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, delay));
    const op = await gcp<Operation>(`https://firestore.googleapis.com/v1/${name}`);
    if (op.done) {
      if (op.error) throw new GcpError(op.error.message || "operation failed", 500, "OPERATION_FAILED");
      return true;
    }
    delay = Math.min(delay * 2, 5_000);
  }
  return false;
}
