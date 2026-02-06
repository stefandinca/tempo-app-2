/**
 * Billing Calculation Utilities
 * Aggregates event data to calculate client invoices and team payouts
 */

export interface BillingLineItem {
  eventId: string;
  date: string;
  serviceType: string;
  serviceLabel: string;
  duration: number; // minutes
  basePrice: number; // per hour
  amount: number; // calculated
  attendance: "present" | "absent" | "excused" | null;
  isBillable: boolean;
}

export interface ClientInvoice {
  clientId: string;
  invoiceId?: string; // If generated
  clientName: string;
  sessions: number;
  billableSessions: number;
  excusedSessions: number;
  totalHours: number;
  lineItems: BillingLineItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: "pending" | "issued" | "paid" | "overdue";
}

export interface TeamPayout {
  id?: string; // Payout document ID
  teamMemberId: string;
  teamMemberName: string;
  sessions: number;
  totalHours: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  total: number;
  status: "pending" | "paid";
  paidAt?: string;
}

export interface BillingSummary {
  totalRevenue: number;
  pendingAmount: number;
  paidAmount: number;
  staffCosts: number;
  otherExpenses: number;
  totalExpenses: number;
  profit: number;
  pendingCount: number;
  paidCount: number;
}

/**
 * Get the start and end dates for a given month
 */
export function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Format month for display
 */
export function formatMonth(year: number, month: number): string {
  const date = new Date(year, month, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Calculate amount for a single session
 */
export function calculateSessionAmount(durationMinutes: number, basePricePerHour: number): number {
  return (durationMinutes / 60) * basePricePerHour;
}

/**
 * Aggregate events into client invoices
 */
export function aggregateClientInvoices(
  events: any[],
  clients: any[],
  services: any[],
  existingInvoices: any[] = []
): ClientInvoice[] {
  // Group events by clientId
  const clientEventsMap = new Map<string, any[]>();

  events.forEach(event => {
    if (!event.clientId) return;
    if (!event.attendance) return;

    const existing = clientEventsMap.get(event.clientId) || [];
    existing.push(event);
    clientEventsMap.set(event.clientId, existing);
  });

  const invoices: ClientInvoice[] = [];

  clientEventsMap.forEach((clientEvents, clientId) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;

    const lineItems: BillingLineItem[] = [];
    let totalMinutes = 0;

    clientEvents.forEach(event => {
      const service = services.find(s => s.id === event.type);
      const basePrice = service?.basePrice || 0;
      const serviceBillable = service?.isBillable !== false;

      if (!serviceBillable) return;

      const duration = event.duration || 60;
      const attendance = event.attendance as "present" | "absent" | "excused" | null;
      const isSessionBillable = attendance === "present" || attendance === "absent";
      const amount = isSessionBillable ? calculateSessionAmount(duration, basePrice) : 0;

      lineItems.push({
        eventId: event.id,
        date: event.startTime,
        serviceType: event.type,
        serviceLabel: service?.label || event.type,
        duration,
        basePrice,
        amount,
        attendance,
        isBillable: isSessionBillable
      });

      if (isSessionBillable) {
        totalMinutes += duration;
      }
    });

    if (lineItems.length === 0) return;

    const billableItems = lineItems.filter(item => item.isBillable);
    const excusedCount = lineItems.filter(item => !item.isBillable).length;
    const subtotal = billableItems.reduce((sum, item) => sum + item.amount, 0);
    const discountRate = client.discountRate || 0;
    const discount = subtotal * discountRate;
    const total = subtotal - discount;

    const existingInvoice = existingInvoices.find(inv => inv.clientId === clientId);
    const status = existingInvoice ? (existingInvoice.status as any) : "pending";

    invoices.push({
      clientId,
      invoiceId: existingInvoice?.id,
      clientName: client.name,
      sessions: lineItems.length,
      billableSessions: billableItems.length,
      excusedSessions: excusedCount,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      lineItems,
      subtotal,
      discount,
      total,
      status
    });
  });

  invoices.sort((a, b) => b.total - a.total);
  return invoices;
}

/**
 * Aggregate events into team payouts
 */
export function aggregateTeamPayouts(
  events: any[],
  teamMembers: any[],
  existingPayouts: any[] = []
): TeamPayout[] {
  // Group events by therapist
  const memberEventsMap = new Map<string, any[]>();

  events.forEach(event => {
    // Only count completed sessions for activity tracking
    if (!event.attendance) return;
    
    if (!event.odId && !event.therapistId) return;
    const odId = event.odId || event.therapistId;

    const existing = memberEventsMap.get(odId) || [];
    existing.push(event);
    memberEventsMap.set(odId, existing);
  });

  const payouts: TeamPayout[] = [];

  // Iterate over ALL team members (not just those with events, as salary is fixed)
  teamMembers.forEach(member => {
    const memberEvents = memberEventsMap.get(member.id) || [];
    
    let totalMinutes = 0;
    let sessionCount = 0;

    memberEvents.forEach(event => {
      totalMinutes += event.duration || 60;
      sessionCount++;
    });

    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;

    // Check for existing payout record
    const existingPayout = existingPayouts.find(p => p.teamMemberId === member.id);

    if (existingPayout) {
      // Use stored values
      payouts.push({
        id: existingPayout.id,
        teamMemberId: member.id,
        teamMemberName: member.name,
        sessions: sessionCount,
        totalHours,
        baseSalary: existingPayout.baseAmount,
        bonus: existingPayout.bonusAmount,
        deductions: existingPayout.deductions || 0,
        total: existingPayout.total,
        status: existingPayout.status,
        paidAt: existingPayout.paidAt
      });
    } else {
      // Use defaults
      const baseSalary = member.baseSalary || 0;
      const bonus = member.defaultBonus || 0;
      const deductions = 0;
      const total = baseSalary + bonus - deductions;

      // Only include if they have salary OR activity
      if (total > 0 || sessionCount > 0) {
        payouts.push({
          teamMemberId: member.id,
          teamMemberName: member.name,
          sessions: sessionCount,
          totalHours,
          baseSalary,
          bonus,
          deductions,
          total,
          status: "pending"
        });
      }
    }
  });

  payouts.sort((a, b) => b.total - a.total);
  return payouts;
}

/**
 * Calculate billing summary from invoices, payouts, and general expenses
 */
export function calculateBillingSummary(
  invoices: ClientInvoice[],
  payouts: TeamPayout[] = [],
  expenses: any[] = []
): BillingSummary {
  let totalRevenue = 0;
  let pendingAmount = 0;
  let paidAmount = 0;
  let pendingCount = 0;
  let paidCount = 0;
  let staffCosts = 0;
  let otherExpenses = 0;

  invoices.forEach(invoice => {
    totalRevenue += invoice.total;
    if (invoice.status === "paid") {
      paidAmount += invoice.total;
      paidCount++;
    } else {
      pendingAmount += invoice.total;
      pendingCount++;
    }
  });

  payouts.forEach(payout => {
    // Staff costs include everything committed for the month
    staffCosts += payout.total;
  });

  expenses.forEach(expense => {
    otherExpenses += expense.amount;
  });

  const totalExpenses = staffCosts + otherExpenses;
  const profit = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    pendingAmount,
    paidAmount,
    staffCosts,
    otherExpenses,
    totalExpenses,
    profit,
    pendingCount,
    paidCount
  };
}
