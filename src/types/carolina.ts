export type CarolinaScoreValue = 'A' | 'D' | 'M'; // Absent, Emerging (Dezvoltare), Mastered (Insusita)

export interface CarolinaItem {
  id: string;
  text: string;
  age?: number; // Age in months if available
}

export interface CarolinaSequence {
  id: string;
  title: string;
  items: CarolinaItem[];
}

export interface CarolinaDomain {
  id: string;
  title: string;
  sequences: CarolinaSequence[];
}

export interface CarolinaScore {
  value: CarolinaScoreValue;
  note?: string;
  updatedAt: string;
}

export interface CarolinaEvaluation {
  id: string;
  clientId: string;
  status: 'in_progress' | 'completed';
  evaluatorId: string;
  evaluatorName: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  scores: Record<string, CarolinaScore>; // Key is item id
  totalMastered: number;
  totalEmerging: number;
  domainProgress: Record<string, { total: number; mastered: number; emerging: number }>;
}

export const CAROLINA_DOMAINS_LIST = [
  "Cognitiv",
  "Comunicare",
  "Adaptare Socială",
  "Motricitate Fină",
  "Motricitate Grosieră"
] as const;
