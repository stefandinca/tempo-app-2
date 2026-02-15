import i18next from "i18next";

/**
 * Clinical Interpretation Utilities
 * Provides context and recommendations based on evaluation scores
 */

export interface ClinicalInterpretation {
  level: 'excellent' | 'good' | 'moderate' | 'significant' | 'profound';
  title: string;
  description: string;
  recommendation: string;
  interventionHours?: string;
}

/**
 * Get clinical interpretation for ABLLS-R scores
 */
export function getABLLSInterpretation(percentage: number): ClinicalInterpretation {
  let level: 'excellent' | 'good' | 'moderate' | 'significant' | 'profound';
  
  if (percentage >= 80) level = 'excellent';
  else if (percentage >= 60) level = 'good';
  else if (percentage >= 40) level = 'moderate';
  else if (percentage >= 20) level = 'significant';
  else level = 'profound';

  return {
    level,
    title: i18next.t(`parent_portal.interpretations.ablls.${level}.title`),
    description: i18next.t(`parent_portal.interpretations.ablls.${level}.description`),
    recommendation: i18next.t(`parent_portal.interpretations.ablls.${level}.recommendation`),
    interventionHours: i18next.t(`parent_portal.interpretations.ablls.${level}.hours`)
  };
}

/**
 * Get clinical interpretation for VB-MAPP based on developmental delay
 */
export function getVBMAPPInterpretation(
  delayPercentage: number,
  severityLabel: string,
  dominantLevel: 1 | 2 | 3
): ClinicalInterpretation {
  const levelKey = (delayPercentage === 0 || severityLabel === 'none') ? 'excellent' : severityLabel;
  const level = levelKey as 'excellent' | 'mild' | 'moderate' | 'significant' | 'profound';

  return {
    level: level === 'mild' ? 'good' : (level === 'significant' ? 'significant' : (level === 'profound' ? 'profound' : level)) as any,
    title: i18next.t(`parent_portal.interpretations.vbmapp.${levelKey}.title`),
    description: i18next.t(`parent_portal.interpretations.vbmapp.${levelKey}.description`, { level: dominantLevel }),
    recommendation: i18next.t(`parent_portal.interpretations.vbmapp.${levelKey}.recommendation`),
    interventionHours: i18next.t(`parent_portal.interpretations.vbmapp.${levelKey}.hours`)
  };
}

/**
 * Get category-level interpretation for ABLLS
 */
export function getCategoryInterpretation(percentage: number): {
  status: 'mastered' | 'developing' | 'emerging' | 'priority';
  label: string;
} {
  if (percentage >= 80) {
    return { status: 'mastered', label: i18next.t('evaluations.status.mastered') };
  }
  if (percentage >= 60) {
    return { status: 'developing', label: i18next.t('evaluations.status.developing') };
  }
  if (percentage >= 40) {
    return { status: 'emerging', label: i18next.t('evaluations.status.emerging') };
  }
  return { status: 'priority', label: i18next.t('evaluations.status.priority') };
}

/**
 * Parent-friendly translations for clinical terms
 */
export const PARENT_FRIENDLY_NAMES: Record<string, string> = {
  // ABLLS-R
  'A': 'Cooperation & Reinforcer Effectiveness',
  'B': 'Visual Performance (Puzzles/Matching)',
  'C': 'Receptive Language (Understanding)',
  'D': 'Imitation',
  'E': 'Vocal Imitation (Echoing)',
  'F': 'Requests (Manding)',
  'G': 'Labeling (Tacting)',
  'H': 'Intraverbals (Conversation)',
  'I': 'Spontaneous Vocalization',
  'J': 'Syntax & Grammar',
  'K': 'Play & Leisure',
  'L': 'Social Interaction',
  'M': 'Group Instruction',
  'N': 'Follow Classroom Routines',
  'O': 'Generalized Responding',
  'P': 'Reading Skills',
  'Q': 'Math Skills',
  'R': 'Writing Skills',
  'S': 'Spelling',
  'T': 'Language Arts',
  'U': 'Dressing',
  'V': 'Eating',
  'W': 'Grooming',
  'X': 'Toileting',
  'Y': 'Gross Motor',
  'Z': 'Fine Motor',
  // VB-MAPP Additional
  'MAND': 'Requesting',
  'TACT': 'Labeling Objects',
  'LR': 'Following Directions',
  'VP-MTS': 'Visual Matching & Puzzles',
  'ECHOIC': 'Repeating Sounds/Words',
  'MOTOR': 'Copying Movements',
  'INTRA': 'Answering Questions',
  'SOCIAL': 'Playing with Peers',
  'IMIT': 'Imitation',
  'VPMTS': 'Visual Matching'
};

export function getParentFriendlyName(id: string, originalName: string): string {
  const key = `parent_portal.clinical_terms.${id.toUpperCase()}`;
  const translated = i18next.t(key);
  // If translation missing, it returns the key itself or the original string
  return translated !== key ? translated : originalName;
}

/**
 * Get intervention recommendation for a VB-MAPP barrier
 */
export function getBarrierRecommendation(barrierId: string): string {
  const recommendations: Record<string, string> = {
    '1': 'Focus on "pairing" the therapist and environment with high-value reinforcers. Reduce demand density and use errorless teaching.',
    '2': 'Prioritize mand training (requesting) using high-motivation items. Fade prompts quickly to encourage spontaneity.',
    '3': 'Use functional natural environment teaching (NET). Ensure the child has a reason to tact beyond just labeling for the therapist.',
    '9': 'Implement a systematic prompt-fading procedure. Move from most-to-least to least-to-most prompting where appropriate.',
    '13': 'Conduct a formal preference assessment. Limit free access to highly preferred items to maintain their value as reinforcers.',
    '16': 'Identify the sensory function of the behavior. Provide "heavy work" or sensory breaks, and teach functionally equivalent replacement behaviors.',
    '20': 'Work on attending skills and pairing eye contact with reinforcement. Do not force eye contact; make it naturally reinforcing.'
  };

  return recommendations[barrierId] || 'Implement a targeted behavior intervention plan (BIP) focusing on the function of this barrier. Consult with a BCBA for specific protocols.';
}

/**
 * ABLLS Domain Groupings for clinical reporting
 */
export const ABLLS_DOMAINS = {
  'Language & Communication': ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'T'],
  'Academic Readiness': ['M', 'N', 'O', 'P', 'Q', 'R', 'S'],
  'Foundational Skills': ['A', 'B', 'C'],
  'Social & Play': ['K', 'L'],
  'Self-Help & Independence': ['U', 'V', 'W', 'X'],
  'Motor Skills': ['Y', 'Z']
} as const;

/**
 * Calculate domain scores from category summaries
 */
export function calculateDomainScores(
  categorySummaries: Record<string, { percentage: number; totalScore: number; maxPossibleScore: number }>
): Record<string, { percentage: number; categories: string[] }> {
  const domainScores: Record<string, { percentage: number; categories: string[] }> = {};

  for (const [domain, categories] of Object.entries(ABLLS_DOMAINS)) {
    let totalScore = 0;
    let maxScore = 0;
    const includedCategories: string[] = [];

    for (const cat of categories) {
      if (categorySummaries[cat]) {
        totalScore += categorySummaries[cat].totalScore;
        maxScore += categorySummaries[cat].maxPossibleScore;
        includedCategories.push(cat);
      }
    }

    domainScores[domain] = {
      percentage: maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0,
      categories: includedCategories
    };
  }

  return domainScores;
}

/**
 * Get priority intervention areas (categories scoring 40-70%)
 */
export function getPriorityAreas(
  categorySummaries: Record<string, { categoryKey: string; categoryName: string; percentage: number }>
): Array<{ key: string; name: string; percentage: number }> {
  return Object.values(categorySummaries)
    .filter(cat => cat.percentage >= 20 && cat.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage)
    .slice(0, 5)
    .map(cat => ({
      key: cat.categoryKey,
      name: cat.categoryName,
      percentage: cat.percentage
    }));
}
