// Token pricing (USD per 1M tokens) + cost accounting for AI usage.
// Dependency-free so it can be imported on both server and client.

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

interface Rate {
  input: number;
  output: number;
  cacheWrite: number; // 5-min cache write = 1.25x input
  cacheRead: number; // cache read = 0.1x input
}

const PRICING: Record<string, Rate> = {
  "claude-sonnet-4-6": { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  "claude-opus-4-8": { input: 5, output: 25, cacheWrite: 6.25, cacheRead: 0.5 },
  "claude-haiku-4-5": { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

export function emptyUsage(): TokenUsage {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };
}

/** Accumulate one Anthropic `message.usage` (snake_case) into a running total. */
export function addUsage(acc: TokenUsage, u: any): void {
  if (!u) return;
  acc.inputTokens += u.input_tokens || 0;
  acc.outputTokens += u.output_tokens || 0;
  acc.cacheReadTokens += u.cache_read_input_tokens || 0;
  acc.cacheWriteTokens += u.cache_creation_input_tokens || 0;
}

/** Total billable tokens (cache reads + writes count as input variants). */
export function totalTokens(u: TokenUsage): number {
  return u.inputTokens + u.outputTokens + u.cacheReadTokens + u.cacheWriteTokens;
}

export function computeCostUsd(model: string, u: TokenUsage): number {
  const r = PRICING[model] || PRICING["claude-sonnet-4-6"];
  const cost =
    (u.inputTokens * r.input +
      u.outputTokens * r.output +
      u.cacheWriteTokens * r.cacheWrite +
      u.cacheReadTokens * r.cacheRead) /
    1_000_000;
  return Math.round(cost * 1e6) / 1e6; // 6 decimals (micro-dollars)
}

/** Compact USD formatter that doesn't round tiny costs to $0.00. */
export function formatUsd(n: number): string {
  if (!n) return "$0.00";
  if (n < 0.01) return "$" + n.toFixed(4);
  return "$" + n.toFixed(2);
}
