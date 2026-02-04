// ABLLS and other evaluation types

export type EvaluationType = 'ABLLS' | 'VB-MAPP' | 'OTHER';
export type EvaluationStatus = 'in_progress' | 'completed';
export type ScoreValue = 0 | 1 | 2;

export interface ItemScore {
  score: ScoreValue;
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

// ABLLS Category structure
export interface ABLLSItem {
  id: string;
  text: string;
}

export interface ABLLSCategory {
  key: string;
  name: string;
  items: ABLLSItem[];
}

// ABLLS data from JSON
export type ABLLSData = Record<string, ABLLSItem[]>;

// Score labels for UI
export const SCORE_LABELS: Record<ScoreValue, { label: string; description: string; color: string }> = {
  0: {
    label: '0',
    description: 'Not observed or unable to perform',
    color: 'error'
  },
  1: {
    label: '1',
    description: 'Emerging - performs with prompts or inconsistently',
    color: 'warning'
  },
  2: {
    label: '2',
    description: 'Mastered - performs independently and consistently',
    color: 'success'
  }
};

// Helper to parse ABLLS JSON into structured categories
export function parseABLLSData(data: ABLLSData): ABLLSCategory[] {
  return Object.entries(data).map(([name, items]) => {
    // Extract category key from first item ID (e.g., "A1" -> "A")
    const key = items[0]?.id?.charAt(0) || name.charAt(0);
    return {
      key,
      name,
      items
    };
  });
}

// Helper to compute category summary
export function computeCategorySummary(
  categoryKey: string,
  categoryName: string,
  items: ABLLSItem[],
  scores: Record<string, ItemScore>
): CategorySummary {
  let totalItems = items.length;
  let scoredItems = 0;
  let totalScore = 0;
  let naItems = 0;

  items.forEach(item => {
    const itemScore = scores[item.id];
    if (itemScore !== undefined) {
      if (itemScore.isNA) {
        naItems++;
      } else {
        scoredItems++;
        totalScore += itemScore.score;
      }
    }
  });

  const adjustedTotalItems = totalItems - naItems;
  const maxPossibleScore = adjustedTotalItems * 2; // Max score is 2 per item
  const percentage = maxPossibleScore > 0
    ? Math.round((totalScore / maxPossibleScore) * 100)
    : 0;

  return {
    categoryKey,
    categoryName,
    totalItems: adjustedTotalItems,
    scoredItems,
    totalScore,
    maxPossibleScore,
    percentage
  };
}

// Helper to compute overall evaluation summary
export function computeOverallSummary(
  categories: ABLLSCategory[],
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
    const summary = computeCategorySummary(
      category.key,
      category.name,
      category.items,
      scores
    );
    categorySummaries[category.key] = summary;
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
