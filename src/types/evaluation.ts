import { AbllsItem, AbllsCategory } from "@/data/ablls-r-protocol";

// ABLLS and other evaluation types

export type EvaluationType = 'ABLLS' | 'VB-MAPP' | 'PORTAGE' | 'OTHER';
export type EvaluationStatus = 'in_progress' | 'completed';
export type ScoreValue = 0 | 1 | 2 | 3 | 4;

export interface ItemScore {
  score: number; // Changed from ScoreValue to support up to 4
  note?: string;
  isNA?: boolean;
  updatedAt: string;
}

export interface CategorySummary {
  categoryKey: string;
  categoryName: string;
  totalItems: number;
  scoredItems: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
}

export interface Evaluation {
  id: string;
  clientId: string;
  type: EvaluationType;
  version: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;

  evaluatorId: string;
  evaluatorName: string;

  status: EvaluationStatus;

  // Scores stored as a map
  scores: Record<string, ItemScore>;

  // Computed summaries
  categorySummaries: Record<string, CategorySummary>;

  overallPercentage: number;
  overallScore: number;
  overallMaxScore: number;

  // For re-evaluations
  previousEvaluationId?: string;
}

// Score labels for UI (Default descriptions, protocol has specific ones)
export const SCORE_LABELS: Record<number, { label: string; description: string; color: string }> = {
  0: {
    label: '0',
    description: 'Not observed or unable to perform',
    color: 'error'
  },
  1: {
    label: '1',
    description: 'Emerging - minimal performance',
    color: 'warning'
  },
  2: {
    label: '2',
    description: 'Emerging - partial performance',
    color: 'warning'
  },
  3: {
    label: '3',
    description: 'Near mastery',
    color: 'success'
  },
  4: {
    label: '4',
    description: 'Mastered - independent and consistent',
    color: 'success'
  }
};

// Helper to compute category summary using full ABLLS-R protocol
export function computeCategorySummary(
  category: AbllsCategory,
  scores: Record<string, ItemScore>
): CategorySummary {
  let scoredItems = 0;
  let totalScore = 0;
  let maxPossibleScore = 0;
  let naItemsCount = 0;

  category.items.forEach(item => {
    const itemScore = scores[item.id];
    if (itemScore !== undefined && itemScore.isNA) {
      naItemsCount++;
    } else {
      maxPossibleScore += item.maxScore;
      if (itemScore !== undefined) {
        scoredItems++;
        totalScore += itemScore.score;
      }
    }
  });

  const percentage = maxPossibleScore > 0
    ? Math.round((totalScore / maxPossibleScore) * 100)
    : 0;

  return {
    categoryKey: category.id,
    categoryName: category.title,
    totalItems: category.items.length - naItemsCount,
    scoredItems,
    totalScore,
    maxPossibleScore,
    percentage
  };
}

// Helper to compute overall evaluation summary
export function computeOverallSummary(
  categories: AbllsCategory[],
  scores: Record<string, ItemScore>
): {
  categorySummaries: Record<string, CategorySummary>;
  overallPercentage: number;
  overallScore: number;
  overallMaxScore: number;
} {
  const categorySummaries: Record<string, CategorySummary> = {};
  let overallScore = 0;
  let overallMaxScore = 0;

  categories.forEach(category => {
    const summary = computeCategorySummary(category, scores);
    categorySummaries[category.id] = summary;
    overallScore += summary.totalScore;
    overallMaxScore += summary.maxPossibleScore;
  });

  const overallPercentage = overallMaxScore > 0
    ? Math.round((overallScore / overallMaxScore) * 100)
    : 0;

  return {
    categorySummaries,
    overallPercentage,
    overallScore,
    overallMaxScore
  };
}

