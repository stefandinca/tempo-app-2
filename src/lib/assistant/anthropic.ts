// Server-only Anthropic client. Lazy so the build doesn't require a key.
import Anthropic from "@anthropic-ai/sdk";
import { tenantEnvSuffix } from "@/lib/tenant";

export const MODEL = "claude-sonnet-4-6";

/**
 * One client per key. Every clinic has its own Anthropic key — usage and
 * spending stay attributable to the clinic that incurred them — and they now
 * share a single deployment, so the key is chosen per request rather than read
 * once from the environment.
 */
const clients = new Map<string, Anthropic>();

/**
 * The key for a tenant: `ANTHROPIC_API_KEY_<TENANT>`, falling back to the
 * unsuffixed `ANTHROPIC_API_KEY`. Returns "" when nothing is configured, which
 * is a normal state — the demo has no key and answers Mira from a script.
 */
export function anthropicKeyFor(tenantId: string): string {
  const own = tenantId ? process.env[`ANTHROPIC_API_KEY_${tenantEnvSuffix(tenantId)}`] : "";
  return (own || process.env.ANTHROPIC_API_KEY || "").trim();
}

export function hasAnthropicKey(tenantId: string): boolean {
  return !!anthropicKeyFor(tenantId);
}

export function getAnthropic(tenantId: string): Anthropic {
  const key = anthropicKeyFor(tenantId);
  if (!key) {
    throw new Error(`No Anthropic API key configured for tenant "${tenantId || "(platform)"}"`);
  }
  let client = clients.get(key);
  if (!client) {
    client = new Anthropic({ apiKey: key });
    clients.set(key, client);
  }
  return client;
}
