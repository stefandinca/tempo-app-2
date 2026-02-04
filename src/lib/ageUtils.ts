export interface Age {
  years: number;
  months: number;
  totalMonths: number;
}

export function calculateAge(dob: string | Date | null | undefined): Age | null {
  if (!dob) return null;

  const birthDate = typeof dob === 'string' ? new Date(dob) : dob;
  const now = new Date();

  if (isNaN(birthDate.getTime())) return null;

  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && now.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }
  
  if (now.getDate() < birthDate.getDate()) {
      months--;
      if (months < 0) {
          months += 12;
          // years adjustment is already handled above if months went negative from the subtraction
          // but if months was positive and became negative here?
          // E.g. Born Jan 31, Now Mar 1.
          // Diff years: 0. Diff months: 2.
          // Day check: 1 < 31. months -> 1.
          // Result: 0y 1m. Correct.
          
          // E.g. Born Jan 31, Now Feb 28 (not leap).
          // Diff years: 0. Diff months: 1.
          // Day check: 28 < 31. months -> 0.
          // Result: 0y 0m. Correct? Yes approximately.
      }
  }

  const totalMonths = (years * 12) + months;

  return {
    years,
    months,
    totalMonths
  };
}

export function formatAge(age: Age | null): string {
  if (!age) return "Unknown";
  return `${age.years}y ${age.months}m`;
}

export function getVBMAPPDevelopmentalAge(level: 1 | 2 | 3): string {
  switch (level) {
    case 1: return "0-18 months";
    case 2: return "18-30 months";
    case 3: return "30-48 months";
    default: return "Unknown";
  }
}

// Midpoint of levels for calculation
export function getVBMAPPLevelMidpoint(level: 1 | 2 | 3): number {
    switch (level) {
      case 1: return 9;   // 0-18
      case 2: return 24;  // 18-30
      case 3: return 39;  // 30-48
      default: return 0;
    }
  }

export function calculateDevelopmentalDelay(
  chronologicalAgeMonths: number,
  developmentalAgeMonths: number
): {
  delayMonths: number;
  delayPercentage: number;
  severityLabel: 'mild' | 'moderate' | 'severe' | 'profound' | 'none';
} {
  if (chronologicalAgeMonths <= developmentalAgeMonths) {
    return {
      delayMonths: 0,
      delayPercentage: 0,
      severityLabel: 'none'
    };
  }

  const delayMonths = chronologicalAgeMonths - developmentalAgeMonths;
  const delayPercentage = Math.round((delayMonths / chronologicalAgeMonths) * 100);

  let severityLabel: 'mild' | 'moderate' | 'severe' | 'profound' = 'mild';
  if (delayPercentage >= 75) severityLabel = 'profound';
  else if (delayPercentage >= 50) severityLabel = 'severe';
  else if (delayPercentage >= 25) severityLabel = 'moderate';

  return {
    delayMonths,
    delayPercentage,
    severityLabel
  };
}