// Shared types and utility functions for program progress tracking

export interface ProgramScores {
  minus: number;
  zero: number;
  prompted: number;
  plus: number;
}

export interface SessionScore {
  sessionId: string;
  date: Date;
  scores: ProgramScores;
  sessionType: string;
  notes?: string;
}

export function calculateSuccessRate(scores: ProgramScores): number {
  const total = scores.minus + scores.zero + scores.prompted + scores.plus;
  if (total === 0) return 0;
  return Math.round((scores.plus / total) * 100);
}

export function calculateTrend(history: SessionScore[]): "improving" | "stable" | "declining" | "insufficient" {
  if (history.length < 2) return "insufficient";

  const recent = history.slice(-3);
  const previous = history.slice(-6, -3);

  if (previous.length === 0) return "insufficient";

  const recentAvg = recent.reduce((sum, s) => sum + calculateSuccessRate(s.scores), 0) / recent.length;
  const previousAvg = previous.reduce((sum, s) => sum + calculateSuccessRate(s.scores), 0) / previous.length;

  const diff = recentAvg - previousAvg;
  if (diff > 5) return "improving";
  if (diff < -5) return "declining";
  return "stable";
}
