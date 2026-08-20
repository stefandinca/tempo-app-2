"use client";

import { auth } from "@/lib/firebase";

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new PlatformError("not_signed_in", 401);
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
    "Content-Type": "application/json",
  };
}

export class PlatformError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function unwrap<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new PlatformError(body.error || "request_failed", res.status);
  }
  return (await res.json()) as T;
}

export async function platformGet<T>(path: string): Promise<T> {
  return unwrap<T>(await fetch(path, { headers: await authHeaders() }));
}

export async function platformPatch<T>(path: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(path, { method: "PATCH", headers: await authHeaders(), body: JSON.stringify(body) }),
  );
}

export async function platformPut<T>(path: string, body: unknown): Promise<T> {
  return unwrap<T>(
    await fetch(path, { method: "PUT", headers: await authHeaders(), body: JSON.stringify(body) }),
  );
}

export async function platformDelete<T>(path: string): Promise<T> {
  return unwrap<T>(await fetch(path, { method: "DELETE", headers: await authHeaders() }));
}

/**
 * Multipart upload. Deliberately does NOT use `authHeaders()`: setting
 * Content-Type by hand strips the multipart boundary the browser generates,
 * and the request arrives unparseable.
 */
export async function platformUpload<T>(path: string, file: File): Promise<T> {
  const user = auth.currentUser;
  if (!user) throw new PlatformError("not_signed_in", 401);
  const form = new FormData();
  form.append("file", file);
  return unwrap<T>(
    await fetch(path, {
      method: "PUT",
      headers: { Authorization: `Bearer ${await user.getIdToken()}` },
      body: form,
    }),
  );
}
