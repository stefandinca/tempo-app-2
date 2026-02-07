import { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint, 
  doc, 
  getDoc, 
  DocumentData,
  where,
  orderBy,
  limit 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// ... existing generic hook ...
export function useCollection<T = DocumentData>(
  collectionName: string, 
  constraints: QueryConstraint[] = [],
  limitCount?: number
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const finalConstraints = [...constraints];
    if (limitCount) {
      finalConstraints.push(limit(limitCount));
    }
    const q = query(collection(db, collectionName), ...finalConstraints);

    let cancelled = false;

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        if (cancelled) return;
        const items: T[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName, limitCount]); // Added limitCount to dependencies

  return { data, loading, error };
}

// Specific Hooks
export function useEvents() {
  return useCollection<any>("events", [orderBy("startTime", "desc")], 100);
}

export function useClients() {
  return useCollection<any>("clients", [orderBy("name", "asc")], 500);
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
  email: string;
  phone?: string;
  photoURL?: string;
  sessions?: number;
  clients?: number;
  isActive?: boolean;
  weeklyCapacity?: number; // Added for utilization analytics
}

export function useTeamMembers() {
  return useCollection<TeamMember>("team_members", [orderBy("name", "asc")], 100);
}

export function useServices() {
  return useCollection<any>("services", [orderBy("label", "asc")]);
}

export function usePrograms() {
  return useCollection<any>("programs", [orderBy("title", "asc")]);
}

export function useClientEvents(clientId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "events"),
      where("clientId", "==", clientId),
      orderBy("startTime", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching client events:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  return { data, loading, error };
}

// Events filtered by month
export function useEventsByMonth(year: number, month: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Calculate month bounds
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const q = query(
      collection(db, "events"),
      where("startTime", ">=", startDate.toISOString()),
      where("startTime", "<=", endDate.toISOString()),
      orderBy("startTime", "asc")
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching events by month:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [year, month]);

  return { data, loading, error };
}

// Intervention Plans - subcollection under clients
export interface InterventionPlan {
  id: string;
  name: string;
  programIds: string[];
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "draft";
  createdAt: string;
  createdBy?: string;
}

export function useInterventionPlans(clientId: string) {
  const [data, setData] = useState<InterventionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", clientId, "interventionPlans"),
      orderBy("createdAt", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: InterventionPlan[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as InterventionPlan);
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching intervention plans:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  // Helper to get the active plan for a specific date
  const getActivePlanForDate = (date: Date): InterventionPlan | null => {
    return data.find(plan => {
      if (plan.status !== "active") return false;
      const start = new Date(plan.startDate);
      const end = new Date(plan.endDate);
      // Set end date to end of day for inclusive comparison
      end.setHours(23, 59, 59, 999);
      return date >= start && date <= end;
    }) || null;
  };

  const activePlan = data.find(p => p.status === "active") || null;

  return { data, loading, error, activePlan, getActivePlanForDate };
}

// System Settings (Singleton)
export function useSystemSettings() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "system_settings", "config"), 
      (doc) => {
        if (doc.exists()) {
          setData(doc.data());
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching system settings:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { data, loading, error };
}

// Invoices for a specific client
export function useClientInvoices(clientId: string) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "invoices"),
      where("clientId", "==", clientId),
      orderBy("date", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching client invoices:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  return { data, loading, error };
}

// Invoices by Month (Admin)
export function useInvoicesByMonth(year: number, month: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Calculate month bounds matching the invoice 'date' string (YYYY-MM-DD)
    // We'll filter by string comparison which works for ISO dates
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-31`;

    const q = query(
      collection(db, "invoices"),
      where("date", ">=", startStr),
      where("date", "<=", endStr),
      orderBy("date", "desc"),
      limit(200)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching monthly invoices:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [year, month]);

  return { data, loading, error };
}

// Payouts by Month (Admin)
export function usePayoutsByMonth(year: number, month: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Standardize month string YYYY-MM
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    const q = query(
      collection(db, "payouts"),
      where("month", "==", monthStr),
      limit(100)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching monthly payouts:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [year, month]);

  return { data, loading, error };
}

// Expenses by Month (Admin)
export function useExpensesByMonth(year: number, month: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Format bounds as YYYY-MM-DD
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
    const startStr = `${monthStr}-01`;
    const endStr = `${monthStr}-31`;

    const q = query(
      collection(db, "expenses"),
      where("date", ">=", startStr),
      where("date", "<=", endStr),
      orderBy("date", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: any[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching monthly expenses:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [year, month]);

  return { data, loading, error };
}

// Homework - subcollection under clients
export interface HomeworkItem {
  id: string;
  title: string;
  description?: string;
  assignedBy: string;
  frequency?: "daily" | "weekly" | "3x_week" | "as_needed";
  dueDate?: string;
  completed: boolean;
  completedAt?: string | null;
  parentNotes?: string;
  createdAt: string;
}

export function useHomework(clientId: string) {
  const [data, setData] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setData([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", clientId, "homework"),
      orderBy("createdAt", "desc"),
      limit(100)
    );

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items: HomeworkItem[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as HomeworkItem);
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching homework:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  return { data, loading, error };
}

// Recurring Expenses (Admin)
export function useRecurringExpenses() {
  return useCollection<any>("recurring_expenses");
}
