export type ExpenseCategory = 'rent' | 'taxes' | 'utilities' | 'supplies' | 'marketing' | 'other';

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  date: string; // ISO date
  isRecurring: boolean;
  recurringId?: string; // Links instances of recurring bills
  notes?: string;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  frequency: 'monthly' | 'yearly';
  startDate: string;
  endDate?: string;
  active: boolean;
  notes?: string;
}
