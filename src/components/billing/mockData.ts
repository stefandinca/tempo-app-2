export const BILLING_STATS = {
  revenue: { value: 45230, change: 12, trend: 'up' },
  pending: { value: 12450, count: 8 },
  paid: { value: 32780, count: 34 },
};

export const INVOICES = [
  { id: "inv-001", client: "John Smith", date: "2026-01-28", amount: 1200, status: "paid" },
  { id: "inv-002", client: "Jane Doe", date: "2026-01-29", amount: 800, status: "pending" },
  { id: "inv-003", client: "Mike Brown", date: "2026-01-25", amount: 1350, status: "paid" },
  { id: "inv-004", client: "Sara Lee", date: "2026-01-30", amount: 950, status: "overdue" },
  { id: "inv-005", client: "Alex Kim", date: "2026-01-27", amount: 1100, status: "pending" },
  { id: "inv-006", client: "Emma Wilson", date: "2026-01-26", amount: 600, status: "paid" },
  { id: "inv-007", client: "Lucas Martin", date: "2026-01-31", amount: 1500, status: "pending" },
];
