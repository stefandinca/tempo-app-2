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
  if (percentage >= 80) {
    return {
      level: 'excellent',
      title: 'Well-Developed Skills',
      description: 'Skills are well-developed across assessed domains. The client demonstrates strong foundational abilities.',
      recommendation: 'Focus on generalization, maintenance, and advancing to higher-level skills. Consider transitioning to less intensive support.',
    };
  }

  if (percentage >= 60) {
    return {
      level: 'good',
      title: 'Good Progress',
      description: 'Client shows good progress with some areas still developing. Most foundational skills are present.',
      recommendation: 'Continue current intervention plan with targeted focus on gap areas. Monitor progress closely.',
      interventionHours: '15-25 hours/week recommended'
    };
  }

  if (percentage >= 40) {
    return {
      level: 'moderate',
      title: 'Moderate Skill Deficits',
      description: 'Moderate skill deficits present across multiple domains. Client requires structured intervention.',
      recommendation: 'Intensive ABA intervention recommended with focus on foundational skills and communication.',
      interventionHours: '20-30 hours/week recommended'
    };
  }

  if (percentage >= 20) {
    return {
      level: 'significant',
      title: 'Significant Delays',
      description: 'Significant developmental delays identified. Client needs comprehensive support across all domains.',
      recommendation: 'Comprehensive ABA program required. Prioritize early learner curriculum and basic communication.',
      interventionHours: '25-35 hours/week recommended'
    };
  }

  return {
    level: 'profound',
    title: 'Profound Delays',
    description: 'Profound skill deficits present. Client requires maximum intervention intensity.',
    recommendation: 'Maximum intensity ABA program recommended. Focus on foundational attending, imitation, and early manding.',
    interventionHours: '30-40 hours/week recommended'
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
  if (delayPercentage === 0 || severityLabel === 'none') {
    return {
      level: 'excellent',
      title: 'Age-Appropriate Development',
      description: 'Verbal behavior milestones are developing at an age-appropriate rate.',
      recommendation: 'Continue current programming. Monitor for maintenance and generalization of skills.',
    };
  }

  if (severityLabel === 'mild') {
    return {
      level: 'good',
      title: 'Mild Developmental Delay',
      description: `Client is functioning at Level ${dominantLevel} with mild delays in verbal behavior development.`,
      recommendation: 'Regular therapy sessions recommended. Focus on emerging skills to close the developmental gap.',
      interventionHours: '10-20 hours/week recommended'
    };
  }

  if (severityLabel === 'moderate') {
    return {
      level: 'moderate',
      title: 'Moderate Developmental Delay',
      description: `Client demonstrates moderate delays, functioning at Level ${dominantLevel}. Gaps exist in multiple verbal operants.`,
      recommendation: 'Intensive early intervention recommended. Prioritize mand training and foundational verbal operants.',
      interventionHours: '20-30 hours/week recommended'
    };
  }

  if (severityLabel === 'severe') {
    return {
      level: 'significant',
      title: 'Severe Developmental Delay',
      description: `Client shows severe delays with verbal behavior functioning at Level ${dominantLevel}. Significant gaps across all operants.`,
      recommendation: 'Comprehensive ABA program required. Focus on establishing basic verbal operants and reducing barriers.',
      interventionHours: '25-35 hours/week recommended'
    };
  }

  return {
    level: 'profound',
    title: 'Profound Developmental Delay',
    description: `Client demonstrates profound delays, functioning significantly below chronological age at Level ${dominantLevel}.`,
    recommendation: 'Maximum intensity intervention required. Address barriers while building foundational skills.',
    interventionHours: '30-40 hours/week recommended'
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
    return { status: 'mastered', label: 'Well-Developed' };
  }
  if (percentage >= 60) {
    return { status: 'developing', label: 'Developing' };
  }
  if (percentage >= 40) {
    return { status: 'emerging', label: 'Emerging' };
  }
  return { status: 'priority', label: 'Priority Target' };
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
  return PARENT_FRIENDLY_NAMES[id.toUpperCase()] || originalName;
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
