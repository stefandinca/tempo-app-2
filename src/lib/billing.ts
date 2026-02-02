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
  odId: string;
  odName: string;
  sessions: number;
  totalHours: number;
  hourlyRate: number;
  calculatedPayout: number;
}

export interface BillingSummary {
  totalRevenue: number;
  pendingAmount: number;
  paidAmount: number;
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
  existingInvoices: any[] = [] // Now passing real Firestore invoices
): ClientInvoice[] {
  // Group events by clientId
  const clientEventsMap = new Map<string, any[]>();

  events.forEach(event => {
    if (!event.clientId) return;
    // Only include sessions with attendance marked
    if (!event.attendance) return;

    const existing = clientEventsMap.get(event.clientId) || [];
    existing.push(event);
    clientEventsMap.set(event.clientId, existing);
  });

  // Build invoices
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

      // Present and Absent are billable, Excused is not
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

    // Check for existing invoice
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

  // Sort by total descending
  invoices.sort((a, b) => b.total - a.total);

  return invoices;
}

/**
 * Aggregate events into team payouts
 */
export function aggregateTeamPayouts(
  events: any[],
  teamMembers: any[]
): TeamPayout[] {
  // Group events by odId
  const memberEventsMap = new Map<string, any[]>();

  events.forEach(event => {
    if (!event.odId && !event.therapistId) return;
    const odId = event.odId || event.therapistId;

    const existing = memberEventsMap.get(odId) || [];
    existing.push(event);
    memberEventsMap.set(odId, existing);
  });

  // Build payouts
  const payouts: TeamPayout[] = [];

  memberEventsMap.forEach((memberEvents, odId) => {
    const member = teamMembers.find(m => m.id === odId);
    if (!member) return;

    let totalMinutes = 0;
    let sessionCount = 0;

    memberEvents.forEach(event => {
      // Count all sessions (not just present - staff worked regardless)
      totalMinutes += event.duration || 60;
      sessionCount++;
    });

    const hourlyRate = member.hourlyRate || 0;
    const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
    const calculatedPayout = totalHours * hourlyRate;

    payouts.push({
      odId,
      odName: member.name,
      sessions: sessionCount,
      totalHours,
      hourlyRate,
      calculatedPayout
    });
  });

  // Sort by payout descending
  payouts.sort((a, b) => b.calculatedPayout - a.calculatedPayout);

  return payouts;
}

/**
 * Calculate billing summary from invoices
 */
export function calculateBillingSummary(invoices: ClientInvoice[]): BillingSummary {
  let totalRevenue = 0;
  let pendingAmount = 0;
  let paidAmount = 0;
  let pendingCount = 0;
  let paidCount = 0;

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

  return {
    totalRevenue,
    pendingAmount,
    paidAmount,
    pendingCount,
    paidCount
  };
}