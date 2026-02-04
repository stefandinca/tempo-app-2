// VB-MAPP (Verbal Behavior Milestones Assessment and Placement Program) Types

// Milestone scoring: 0 = Not present, 0.5 = Emerging, 1 = Mastered
export type MilestoneScore = 0 | 0.5 | 1;

// Barrier scoring: 0 = No barrier, 1-4 = Severity level
export type BarrierScore = 0 | 1 | 2 | 3 | 4;

// Transition scoring: 1-5 readiness level
export type TransitionScore = 1 | 2 | 3 | 4 | 5;

export interface VBMAPPItemScore {
  score: MilestoneScore | BarrierScore | TransitionScore;
  note?: string;
  isNA?: boolean;
  updatedAt: string;
}

export interface VBMAPPMilestoneItem {
  id: string;
  text: string;
  months: number; // Developmental milestone age in months
}

export interface VBMAPPSkillArea {
  id: string;
  name: string;
  code: string;
  items: VBMAPPMilestoneItem[];
}

export interface VBMAPPLevel {
  name: string;
  description: string;
  areas: Record<string, VBMAPPSkillArea>;
}

export interface VBMAPPBarrierItem {
  id: string;
  text: string;
}

export interface VBMAPPTransitionItem {
  id: string;
  text: string;
}

export interface VBMAPPTaskItem {
  id: string;
  text: string;
}

export interface VBMAPPIEPItem {
  id: string;
  text: string;
}

export interface VBMAPPData {
  milestones: {
    level1: VBMAPPLevel;
    level2: VBMAPPLevel;
    level3: VBMAPPLevel;
  };
  barriers: {
    name: string;
    description: string;
    items: VBMAPPBarrierItem[];
  };
  transition: {
    name: string;
    description: string;
    items: VBMAPPTransitionItem[];
  };
  taskAnalysis: {
    name: string;
    description: string;
    items: VBMAPPTaskItem[];
  };
  iepObjectives: {
    name: string;
    description: string;
    items: VBMAPPIEPItem[];
  };
}

// Parsed structures for easier use
export interface ParsedSkillArea {
  id: string;
  code: string;
  name: string;
  level: 1 | 2 | 3;
  levelName: string;
  items: VBMAPPMilestoneItem[];
}

export interface SkillAreaSummary {
  areaId: string;
  areaName: string;
  areaCode: string;
  level: 1 | 2 | 3;
  scoredItems: number;
  totalItems: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
}

export interface LevelSummary {
  level: 1 | 2 | 3;
  levelName: string;
  scoredItems: number;
  totalItems: number;
  totalScore: number;
  maxPossibleScore: number;
  percentage: number;
  areaSummaries: Record<string, SkillAreaSummary>;
}

export interface BarrierSummary {
  totalBarriers: number;
  scoredBarriers: number;
  totalSeverity: number;
  maxSeverity: number;
  averageSeverity: number;
  severeBarriers: string[]; // IDs of barriers scored 3 or 4
}

export interface TransitionSummary {
  scoredItems: number;
  totalItems: number;
  totalScore: number;
  maxScore: number;
  percentage: number;
  readinessLevel: 'not_ready' | 'emerging' | 'developing' | 'ready';
}

export type VBMAPPEvaluationStatus = 'in_progress' | 'completed';

export interface VBMAPPEvaluation {
  id: string;
  clientId: string;
  type: 'VB-MAPP';
  version: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  evaluatorId: string;
  evaluatorName: string;
  status: VBMAPPEvaluationStatus;

  // Scores for different sections
  milestoneScores: Record<string, VBMAPPItemScore>;
  barrierScores: Record<string, VBMAPPItemScore>;
  transitionScores: Record<string, VBMAPPItemScore>;

  // Summaries
  levelSummaries: Record<string, LevelSummary>;
  barrierSummary: BarrierSummary;
  transitionSummary: TransitionSummary;

  // Overall
  overallMilestoneScore: number;
  overallMilestoneMaxScore: number;
  overallMilestonePercentage: number;
  dominantLevel: 1 | 2 | 3; // The level where most skills are demonstrated

  previousEvaluationId?: string;
}

// Helper function to parse VB-MAPP JSON data
export function parseVBMAPPData(data: VBMAPPData): {
  skillAreas: ParsedSkillArea[];
  barriers: VBMAPPBarrierItem[];
  transition: VBMAPPTransitionItem[];
  taskAnalysis: VBMAPPTaskItem[];
  iepObjectives: VBMAPPIEPItem[];
} {
  const skillAreas: ParsedSkillArea[] = [];

  // Parse Level 1
  Object.entries(data.milestones.level1.areas).forEach(([key, area]) => {
    skillAreas.push({
      id: area.id,
      code: area.code,
      name: area.name,
      level: 1,
      levelName: data.milestones.level1.name,
      items: area.items
    });
  });

  // Parse Level 2
  Object.entries(data.milestones.level2.areas).forEach(([key, area]) => {
    skillAreas.push({
      id: area.id,
      code: area.code,
      name: area.name,
      level: 2,
      levelName: data.milestones.level2.name,
      items: area.items
    });
  });

  // Parse Level 3
  Object.entries(data.milestones.level3.areas).forEach(([key, area]) => {
    skillAreas.push({
      id: area.id,
      code: area.code,
      name: area.name,
      level: 3,
      levelName: data.milestones.level3.name,
      items: area.items
    });
  });

  return {
    skillAreas,
    barriers: data.barriers.items,
    transition: data.transition.items,
    taskAnalysis: data.taskAnalysis.items,
    iepObjectives: data.iepObjectives.items
  };
}

// Compute summaries for an evaluation
export function computeVBMAPPSummaries(
  skillAreas: ParsedSkillArea[],
  barriers: VBMAPPBarrierItem[],
  transition: VBMAPPTransitionItem[],
  milestoneScores: Record<string, VBMAPPItemScore>,
  barrierScores: Record<string, VBMAPPItemScore>,
  transitionScores: Record<string, VBMAPPItemScore>
): {
  levelSummaries: Record<string, LevelSummary>;
  barrierSummary: BarrierSummary;
  transitionSummary: TransitionSummary;
  overallMilestoneScore: number;
  overallMilestoneMaxScore: number;
  overallMilestonePercentage: number;
  dominantLevel: 1 | 2 | 3;
} {
  // Initialize level summaries
  const levelSummaries: Record<string, LevelSummary> = {
    '1': {
      level: 1,
      levelName: 'Level 1 (0-18 months)',
      scoredItems: 0,
      totalItems: 0,
      totalScore: 0,
      maxPossibleScore: 0,
      percentage: 0,
      areaSummaries: {}
    },
    '2': {
      level: 2,
      levelName: 'Level 2 (18-30 months)',
      scoredItems: 0,
      totalItems: 0,
      totalScore: 0,
      maxPossibleScore: 0,
      percentage: 0,
      areaSummaries: {}
    },
    '3': {
      level: 3,
      levelName: 'Level 3 (30-48 months)',
      scoredItems: 0,
      totalItems: 0,
      totalScore: 0,
      maxPossibleScore: 0,
      percentage: 0,
      areaSummaries: {}
    }
  };

  // Process each skill area
  skillAreas.forEach((area) => {
    const levelKey = area.level.toString();
    const areaSummary: SkillAreaSummary = {
      areaId: area.id,
      areaName: area.name,
      areaCode: area.code,
      level: area.level,
      scoredItems: 0,
      totalItems: area.items.length,
      totalScore: 0,
      maxPossibleScore: area.items.length, // Max 1 per item
      percentage: 0
    };

    area.items.forEach((item) => {
      const score = milestoneScores[item.id];
      if (score !== undefined) {
        if (score.isNA) {
          areaSummary.totalItems--;
          areaSummary.maxPossibleScore--;
        } else {
          areaSummary.scoredItems++;
          areaSummary.totalScore += score.score as number;
        }
      }
    });

    areaSummary.percentage = areaSummary.maxPossibleScore > 0
      ? Math.round((areaSummary.totalScore / areaSummary.maxPossibleScore) * 100)
      : 0;

    levelSummaries[levelKey].areaSummaries[area.code] = areaSummary;
    levelSummaries[levelKey].totalItems += areaSummary.totalItems;
    levelSummaries[levelKey].scoredItems += areaSummary.scoredItems;
    levelSummaries[levelKey].totalScore += areaSummary.totalScore;
    levelSummaries[levelKey].maxPossibleScore += areaSummary.maxPossibleScore;
  });

  // Calculate level percentages
  Object.values(levelSummaries).forEach((level) => {
    level.percentage = level.maxPossibleScore > 0
      ? Math.round((level.totalScore / level.maxPossibleScore) * 100)
      : 0;
  });

  // Compute barrier summary
  let totalSeverity = 0;
  let scoredBarriers = 0;
  const severeBarriers: string[] = [];

  barriers.forEach((barrier) => {
    const score = barrierScores[barrier.id];
    if (score !== undefined) {
      scoredBarriers++;
      totalSeverity += score.score as number;
      if ((score.score as number) >= 3) {
        severeBarriers.push(barrier.id);
      }
    }
  });

  const barrierSummary: BarrierSummary = {
    totalBarriers: barriers.length,
    scoredBarriers,
    totalSeverity,
    maxSeverity: barriers.length * 4,
    averageSeverity: scoredBarriers > 0 ? Math.round((totalSeverity / scoredBarriers) * 10) / 10 : 0,
    severeBarriers
  };

  // Compute transition summary
  let transitionTotalScore = 0;
  let transitionScoredItems = 0;

  transition.forEach((item) => {
    const score = transitionScores[item.id];
    if (score !== undefined) {
      transitionScoredItems++;
      transitionTotalScore += score.score as number;
    }
  });

  const transitionMaxScore = transition.length * 5;
  const transitionPercentage = transitionMaxScore > 0
    ? Math.round((transitionTotalScore / transitionMaxScore) * 100)
    : 0;

  let readinessLevel: TransitionSummary['readinessLevel'] = 'not_ready';
  if (transitionPercentage >= 80) readinessLevel = 'ready';
  else if (transitionPercentage >= 60) readinessLevel = 'developing';
  else if (transitionPercentage >= 40) readinessLevel = 'emerging';

  const transitionSummary: TransitionSummary = {
    scoredItems: transitionScoredItems,
    totalItems: transition.length,
    totalScore: transitionTotalScore,
    maxScore: transitionMaxScore,
    percentage: transitionPercentage,
    readinessLevel
  };

  // Calculate overall milestone scores
  const overallMilestoneScore = Object.values(levelSummaries).reduce((sum, l) => sum + l.totalScore, 0);
  const overallMilestoneMaxScore = Object.values(levelSummaries).reduce((sum, l) => sum + l.maxPossibleScore, 0);
  const overallMilestonePercentage = overallMilestoneMaxScore > 0
    ? Math.round((overallMilestoneScore / overallMilestoneMaxScore) * 100)
    : 0;

  // Determine dominant level (where most skills are demonstrated)
  let dominantLevel: 1 | 2 | 3 = 1;
  let maxLevelPercentage = 0;

  // Find the highest level where child has significant mastery (>50%)
  [3, 2, 1].forEach((level) => {
    const levelData = levelSummaries[level.toString()];
    if (levelData.percentage > 50 && level > dominantLevel) {
      dominantLevel = level as 1 | 2 | 3;
    }
  });

  // If no level has >50%, use the level with highest percentage
  if (dominantLevel === 1 && levelSummaries['1'].percentage < 50) {
    Object.entries(levelSummaries).forEach(([key, level]) => {
      if (level.percentage > maxLevelPercentage) {
        maxLevelPercentage = level.percentage;
        dominantLevel = level.level;
      }
    });
  }

  return {
    levelSummaries,
    barrierSummary,
    transitionSummary,
    overallMilestoneScore,
    overallMilestoneMaxScore,
    overallMilestonePercentage,
    dominantLevel
  };
}
