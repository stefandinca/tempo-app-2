"use client";

import { auth } from "@/lib/firebase";

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("not_signed_in");
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
