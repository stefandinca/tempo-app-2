/**
 * IEP Goal Generator
 * Auto-generates suggested goals from emerging skills
 */

import { Evaluation, CategorySummary } from "@/types/evaluation";
import { VBMAPPEvaluation, MilestoneScore } from "@/types/vbmapp";

export interface SuggestedGoal {
  id: string;
  skillArea: string;
  skillCode?: string;
  itemId: string;
  itemDescription: string;
  currentScore: number;
  goalText: string;
  shortTermObjective: string;
  targetCriteria: string;
}

/**
 * Goal templates for different skill areas
 */
const GOAL_TEMPLATES = {
  // VB-MAPP templates
  MAND: {
    goal: "will independently request desired items, activities, and information",
    criteria: "across 3 consecutive sessions with 80% accuracy"
  },
  TACT: {
    goal: "will label items, actions, and properties in the environment",
    criteria: "with 90% accuracy across 2 consecutive sessions"
  },
  LR: {
    goal: "will follow instructions and respond to verbal stimuli",
    criteria: "with 80% accuracy across 3 consecutive sessions"
  },
  "VP-MTS": {
    goal: "will match and sort items based on visual features",
    criteria: "with 90% accuracy across 2 consecutive sessions"
  },
  PLAY: {
    goal: "will engage in independent and social play activities",
    criteria: "for at least 5 minutes across 3 consecutive opportunities"
  },
  SOCIAL: {
    goal: "will initiate and respond to social interactions",
    criteria: "in 4 out of 5 opportunities across 3 consecutive sessions"
  },
  IMITATION: {
    goal: "will imitate motor actions demonstrated by others",
    criteria: "within 3 seconds with 80% accuracy"
  },
  ECHOIC: {
    goal: "will repeat vocal sounds and words after a model",
    criteria: "with 80% accuracy across 3 consecutive sessions"
  },
  LRFFC: {
    goal: "will identify items by feature, function, and class",
    criteria: "with 80% accuracy across 3 consecutive sessions"
  },
  IV: {
    goal: "will answer questions and engage in conversational exchanges",
    criteria: "in 4 out of 5 opportunities"
  },

  // ABLLS templates
  A: {
    goal: "will demonstrate cooperation and attention during instructional activities",
    criteria: "for 10+ minutes across 3 consecutive sessions"
  },
  B: {
    goal: "will demonstrate visual performance skills",
    criteria: "with 80% accuracy across 3 consecutive sessions"
  },
  C: {
    goal: "will imitate motor movements and actions",
    criteria: "within 3 seconds with 80% accuracy"
  },
  D: {
    goal: "will respond to receptive language instructions",
    criteria: "with 80% accuracy across 3 consecutive sessions"
  },
  E: {
    goal: "will use functional verbal requests (mands)",
    criteria: "independently in 4 out of 5 opportunities"
  },
  F: {
    goal: "will label items and actions in the environment (tacts)",
    criteria: "with 90% accuracy across 2 consecutive sessions"
  },
  G: {
    goal: "will respond to intraverbal prompts and questions",
    criteria: "with 80% accuracy across 3 consecutive sessions"
  },
  H: {
    goal: "will engage in spontaneous communication",
    criteria: "in at least 5 exchanges per session"
  },
  I: {
    goal: "will follow classroom group instructions",
    criteria: "with 80% accuracy in group settings"
  },
  J: {
    goal: "will demonstrate social interaction skills",
    criteria: "in 4 out of 5 social opportunities"
  },
  K: {
    goal: "will engage in independent and cooperative play",
    criteria: "for 10+ minutes across 3 consecutive sessions"
  },
  L: {
    goal: "will demonstrate appropriate self-help skills",
    criteria: "independently across 3 consecutive days"
  }
};

/**
 * Generate IEP goals from VB-MAPP emerging skills (scored 0.5)
 */
export function generateVBMAPPGoals(
  evaluation: VBMAPPEvaluation,
  clientName: string,
  skillAreas: Array<{ code: string; name: string; items: Array<{ id: string; text: string }> }>
): SuggestedGoal[] {
  const goals: SuggestedGoal[] = [];

  for (const area of skillAreas) {
    for (const item of area.items) {
      const score = evaluation.milestoneScores[item.id]?.score as MilestoneScore | undefined;

      // Only generate goals for emerging skills (0.5)
      if (score === 0.5) {
        const template = GOAL_TEMPLATES[area.code as keyof typeof GOAL_TEMPLATES];
        const goalBase = template?.goal || "will demonstrate the target skill";
        const criteria = template?.criteria || "with 80% accuracy across 3 consecutive sessions";

        goals.push({
          id: item.id,
          skillArea: area.name,
          skillCode: area.code,
          itemId: item.id,
          itemDescription: item.text,
          currentScore: 0.5,
          goalText: `${clientName} ${goalBase} ${criteria}.`,
          shortTermObjective: `${clientName} will demonstrate "${item.text}" with minimal prompting in 3 out of 5 opportunities.`,
          targetCriteria: criteria
        });
      }
    }
  }

  // Sort by skill area and limit to top 10
  return goals.slice(0, 10);
}

/**
 * Generate IEP goals from ABLLS emerging skills (scored 1)
 */
export function generateABLLSGoals(
  evaluation: Evaluation,
  clientName: string,
  categories: Array<{ key: string; name: string; items: Array<{ id: string; text: string }> }>
): SuggestedGoal[] {
  const goals: SuggestedGoal[] = [];

  for (const category of categories) {
    for (const item of category.items) {
      const score = evaluation.scores[item.id]?.score;

      // Only generate goals for emerging skills (1)
      if (score === 1) {
        const template = GOAL_TEMPLATES[category.key as keyof typeof GOAL_TEMPLATES];
        const goalBase = template?.goal || "will demonstrate the target skill";
        const criteria = template?.criteria || "with 80% accuracy across 3 consecutive sessions";

        goals.push({
          id: item.id,
          skillArea: category.name,
          skillCode: category.key,
          itemId: item.id,
          itemDescription: item.text,
          currentScore: 1,
          goalText: `${clientName} ${goalBase} ${criteria}.`,
          shortTermObjective: `${clientName} will demonstrate "${item.text}" with prompting faded to independence.`,
          targetCriteria: criteria
        });
      }
    }
  }

  // Sort by category and limit to top 10
  return goals.slice(0, 10);
}

/**
 * Format goals for PDF export
 */
export function formatGoalsForPDF(goals: SuggestedGoal[]): string[][] {
  return goals.map((goal, index) => [
    `${index + 1}`,
    goal.skillCode || goal.skillArea.substring(0, 4),
    goal.itemDescription.substring(0, 50) + (goal.itemDescription.length > 50 ? '...' : ''),
    goal.goalText
  ]);
}

/**
 * Get summary of emerging skills by area
 */
export function getEmergingSkillsSummary(
  goals: SuggestedGoal[]
): Record<string, number> {
  const summary: Record<string, number> = {};

  for (const goal of goals) {
    const area = goal.skillCode || goal.skillArea;
    summary[area] = (summary[area] || 0) + 1;
  }

  return summary;
}
