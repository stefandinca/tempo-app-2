export interface PortageItem {
  id: string;
  age: string; // e.g., "0-12 luni"
  months: number; // The upper limit in months, e.g., 12, 24, 36...
  text: string;
}

export type PortageCategory = 
  | "Limbaj" 
  | "Socializare" 
  | "Autoservire" 
  | "Comportament cognitiv" 
  | "Comportament motor";

export interface PortageScore {
  achieved: boolean;
  updatedAt: string;
  note?: string;
}

export interface PortageCategorySummary {
  category: PortageCategory;
  totalItems: number;
  achievedItems: number;
  developmentalAgeMonths: number;
  percentage: number;
}

export interface PortageEvaluation {
  id: string;
  clientId: string;
  status: 'in_progress' | 'completed';
  evaluatorId: string;
  evaluatorName: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  scores: Record<string, PortageScore>;
  summaries: Record<string, PortageCategorySummary>;
  overallDevelopmentalAgeMonths: number;
  chronologicalAgeAtEvaluation: number; // in months
  previousEvaluationId?: string;
}

export const PORTAGE_CATEGORIES: PortageCategory[] = [
  "Limbaj",
  "Socializare",
  "Autoservire",
  "Comportament cognitiv",
  "Comportament motor"
];
