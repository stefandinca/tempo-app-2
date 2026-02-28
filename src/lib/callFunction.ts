import { auth } from "@/lib/firebase";

/**
 * Calls a Firebase Cloud Function via our Next.js API proxy (/api/functions).
 * This avoids CORS issues entirely — the browser makes a same-origin request
 * to our API route, which forwards it server-to-server to Cloud Functions.
 */
export async function callFunction<T = any>(functionName: string, data: Record<string, any> = {}): Promise<T> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("Must be signed in to call Cloud Functions.");
  }

  const token = await currentUser.getIdToken();

  const response = await fetch("/api/cloud-functions/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify({ functionName, data }),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const errorDetail = json?.error;
    const error: any = new Error(
      errorDetail?.message || `Cloud Function "${functionName}" failed (proxy status ${response.status}) at /api/cloud-functions/`
    );
    error.code = errorDetail?.status
      ? `functions/${errorDetail.status.toLowerCase().replace(/_/g, "-")}`
      : `functions/internal`;
    throw error;
  }

  return (json?.result ?? json) as T;
}
