// Server-side tools that let the staff assistant (Mira) look up real client data.
// Executed with Admin (rule-bypass) AFTER requireStaffWithConsent has verified a
// staff caller — consistent with firestore.rules, where every staff role
// (admin/coordinator/therapist) may read client data. NEVER call these without
// the gate having passed first.
import { adminDb } from "@/lib/firebaseAdmin";
import { toComparable, type EvalKind } from "@/lib/evaluationComparison";

export const ASSISTANT_TOOLS = [
  {
    name: "find_clients",
    description:
      "Search the center's clients by full or partial name to resolve a name to a clientId and basic info. Call this FIRST whenever the user mentions a child by name. Pass an empty query to list all clients (e.g. to answer 'how many clients do we have').",
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Full or partial client name. Empty string lists all clients." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_client_details",
    description:
      "Fetch one client's record by clientId (obtained from find_clients). Request only the sections you need: 'evaluations' (assessment scores + any saved AI insights), 'sessions' (recent appointments), 'goals' (intervention plans & objectives), 'billing' (subscription, invoices, parent contact). A basic overview is always returned.",
    input_schema: {
      type: "object" as const,
      properties: {
        clientId: { type: "string", description: "The client's id, from find_clients." },
        sections: {
          type: "array",
          items: { type: "string", enum: ["evaluations", "sessions", "goals", "billing"] },
          description: "Which data sections to include. Pass an empty array for just the overview.",
        },
      },
      required: ["clientId", "sections"],
    },
  },
];

const EVAL_SUBS: { sub: string; kind: EvalKind }[] = [
  { sub: "evaluations", kind: "ablls" },
  { sub: "vbmapp_evaluations", kind: "vbmapp" },
  { sub: "portage_evaluations", kind: "portage" },
  { sub: "cars_evaluations", kind: "cars" },
  { sub: "carolina_evaluations", kind: "carolina" },
];

function calcAge(birthDate?: string): number | null {
  if (!birthDate) return null;
  const b = new Date(birthDate);
  if (isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age;
}

// Firestore Admin Timestamp -> ISO string (timestamps are stored inconsistently).
function iso(v: any): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v?.toDate === "function") return v.toDate().toISOString();
  return null;
}

export async function executeAssistantTool(name: string, input: any): Promise<any> {
  const db = adminDb();

  if (name === "find_clients") {
    const q = String(input?.query || "").trim().toLowerCase();
    const snap = await db.collection("clients").get();
    let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    if (q) rows = rows.filter((c) => String(c.name || "").toLowerCase().includes(q));
    rows.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    const clients = rows.slice(0, 15).map((c) => ({
      clientId: c.id,
      name: c.name || null,
      age: calcAge(c.birthDate),
      diagnosis: c.primaryDiagnosis || null,
      diagnosisLevel: c.diagnosisLevel ?? null,
      status: c.status || null,
    }));
    return { totalMatches: rows.length, returned: clients.length, clients };
  }

  if (name === "get_client_details") {
    const clientId = String(input?.clientId || "");
    const sections: string[] = Array.isArray(input?.sections) ? input.sections : [];
    const cdoc = await db.collection("clients").doc(clientId).get();
    if (!cdoc.exists) return { error: "client_not_found" };
    const c = cdoc.data() as any;

    let therapists: string[] = [];
    if (Array.isArray(c.therapistIds) && c.therapistIds.length) {
      const tdocs = await Promise.all(
        c.therapistIds.slice(0, 6).map((id: string) => db.collection("team_members").doc(id).get()),
      );
      therapists = tdocs.filter((d) => d.exists).map((d) => (d.data() as any)?.name).filter(Boolean);
    }

    const result: any = {
      overview: {
        clientId,
        name: c.name || null,
        age: calcAge(c.birthDate),
        diagnosis: c.primaryDiagnosis || null,
        diagnosisLevel: c.diagnosisLevel ?? null,
        status: c.status || null,
        therapists,
        hasActiveSubscription: !!c.hasActiveSubscription,
      },
    };

    if (sections.includes("evaluations")) {
      const evals: any[] = [];
      for (const { sub, kind } of EVAL_SUBS) {
        const es = await db.collection("clients").doc(clientId).collection(sub).get();
        for (const ed of es.docs) {
          const data: any = { id: ed.id, ...(ed.data() as any) };
          data.completedAt = iso(data.completedAt);
          data.updatedAt = iso(data.updatedAt) || data.completedAt || "";
          try {
            const cmp = toComparable(kind, data);
            evals.push({
              kind,
              id: ed.id,
              date: cmp.rawDate || null,
              status: data.status || (data.completedAt ? "completed" : "in_progress"),
              overall: cmp.overallValue,
              unit: cmp.unit,
              direction: cmp.direction,
              note: cmp.overallNote || null,
              categories: cmp.categories.map((ct) => ({ name: ct.name, value: ct.value })),
              aiInsightsSummary: data.aiInsights?.summary || null,
              aiFocusAreas: data.aiInsights?.focusAreas || null,
            });
          } catch {
            evals.push({ kind, id: ed.id, status: data.status || null, note: "could not summarize" });
          }
        }
      }
      evals.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      result.evaluations = evals;
    }

    if (sections.includes("sessions")) {
      const ev = await db.collection("events").where("clientId", "==", clientId).get();
      const sessions = ev.docs
        .map((d) => {
          const e: any = d.data();
          return {
            date: iso(e.startTime) || iso(e.date),
            type: e.type || e.title || null,
            status: e.status || null,
            notes: e.notes || e.sessionNotes || e.summary || null,
          };
        })
        .filter((s) => s.date)
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 15);
      result.sessions = { total: ev.size, recent: sessions };
    }

    if (sections.includes("goals")) {
      const ps = await db.collection("clients").doc(clientId).collection("interventionPlans").get();
      result.goals = ps.docs.map((d) => {
        const p: any = d.data();
        return {
          name: p.name || null,
          status: p.status || null,
          startDate: p.startDate || null,
          endDate: p.endDate || null,
          objectives: Array.isArray(p.objectives)
            ? p.objectives.map((o: any) => ({ title: o.title, status: o.status }))
            : [],
        };
      });
    }

    if (sections.includes("billing")) {
      const inv = await db.collection("invoices").where("clientId", "==", clientId).get();
      const invoices = inv.docs
        .map((d) => {
          const i: any = d.data();
          return {
            number: i.number || i.invoiceNumber || null,
            total: i.total ?? i.amount ?? null,
            currency: i.currency || "RON",
            status: i.status || null,
            date: iso(i.issueDate) || iso(i.date) || iso(i.createdAt),
          };
        })
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        .slice(0, 20);
      result.billing = {
        subscription: {
          active: !!c.hasActiveSubscription,
          price: c.subscriptionPrice ?? null,
          fixedSessionPrice: c.fixedSessionPrice ?? null,
        },
        contact: {
          parentName: c.parentName || c.guardianName || null,
          phone: c.phone || c.parentPhone || c.contactPhone || null,
          email: c.email || c.parentEmail || c.contactEmail || null,
        },
        invoices,
      };
    }

    return result;
  }

  return { error: "unknown_tool" };
}
