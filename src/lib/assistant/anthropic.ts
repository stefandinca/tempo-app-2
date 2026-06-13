// Server-only Anthropic client. Lazy so the build doesn't require the key.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-sonnet-4-6";

let client: Anthropic | undefined;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY env var is not set");
  }
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
