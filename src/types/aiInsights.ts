// Shape of AI-generated evaluation insights. Dependency-free so it can be
// imported from both client and server without bundling the Anthropic SDK.

export interface InsightsResult {
  summary: string;
  strengths: string[];
  focusAreas: string[];
  observations: string[];
}

export interface AiInsights extends InsightsResult {
  model: string;
  generatedAt: string;        // ISO timestamp
  generatedByName?: string;
}
