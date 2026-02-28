"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import ClientReportHTML from "@/components/clients/ClientReportHTML";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProgramScores, SessionScore } from "@/lib/progressUtils";

export default function ClientReportPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("id");
  const monthParam = searchParams.get("month");

  // Compute month boundaries
  const month = (() => {
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) return monthParam;
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [year, mon] = month.split('-').map(Number);
  const monthStart = new Date(year, mon - 1, 1);
  const monthEnd = new Date(year, mon, 0, 23, 59, 59, 999);
  const monthStartISO = monthStart.toISOString();
  const monthEndISO = monthEnd.toISOString();

  const [client, setClient] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [homework, setHomework] = useState<any[]>([]);
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      if (!clientId) {
        setError(t('reports.client.error_missing_id'));
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Client Profile
        const clientDoc = await getDoc(doc(db, "clients", clientId));
        if (!clientDoc.exists()) {
          setError(t('reports.client.error_not_found'));
          setLoading(false);
          return;
        }
        const clientData = { id: clientDoc.id, ...clientDoc.data() } as any;
        setClient(clientData);

        // 2. Fetch Clinic Settings
        const clinicDoc = await getDoc(doc(db, "system_settings", "config"));
        if (clinicDoc.exists()) {
          setClinic(clinicDoc.data().clinic);
        }

        // 3. Fetch Services (for mapping labels)
        const servicesSnap = await getDocs(collection(db, "services"));
        const servicesData = servicesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        setServices(servicesData);

        // 4. Fetch Team Members (for mapping names)
        const teamSnap = await getDocs(collection(db, "team_members"));
        const teamData = teamSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        setTeamMembers(teamData);

        // 5. Fetch Session History (Events) — filtered by month
        const eventsQuery = query(
          collection(db, "events"),
          where("clientId", "==", clientId),
          where("startTime", ">=", monthStartISO),
          where("startTime", "<=", monthEndISO),
          orderBy("startTime", "asc")
        );
        const eventsSnap = await getDocs(eventsQuery);
        const rawEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // Map names to events if missing
        const mappedEvents = rawEvents.map(evt => ({
          ...evt,
          therapistName: evt.therapistName || teamData.find(tm => tm.id === evt.therapistId)?.name || t('reports.client.staff_member')
        }));
        setEvents(mappedEvents);

        // 6. Fetch Evaluations (ABLLS)
        const evalsQuery = query(
          collection(db, "clients", clientId, "evaluations"),
          orderBy("createdAt", "desc")
        );
        const evalsSnap = await getDocs(evalsQuery);
        setEvaluations(evalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 7. Fetch ALL programs, then build scoring from events (like parent portal)
        const progsSnap = await getDocs(collection(db, "programs"));
        const allProgs = progsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

        // Build program scoring map directly from events
        const programMap = new Map<string, {
          id: string;
          title: string;
          description?: string;
          aggregateScores: ProgramScores;
          allNotes: string[];
          sessionHistory: SessionScore[];
        }>();

        mappedEvents.forEach((evt) => {
          const sessionProgramIds = evt.programIds || [];
          const sessionProgramScores = evt.programScores || {};
          const sessionProgramNotes = evt.programNotes || {};
          const sessionDate = evt.startTime ? new Date(evt.startTime) : new Date();

          sessionProgramIds.forEach((programId: string) => {
            const scores = sessionProgramScores[programId] as ProgramScores | undefined;
            const notes = sessionProgramNotes[programId] as string | undefined;
            if (!scores && !notes) return;

            const hasScores = scores && (scores.minus > 0 || scores.zero > 0 || scores.prompted > 0 || scores.plus > 0);
            if (!hasScores && !notes) return;

            const program = allProgs.find((p: any) => p.id === programId);

            if (!programMap.has(programId)) {
              programMap.set(programId, {
                id: programId,
                title: program?.title || program?.name || programId,
                description: program?.description,
                aggregateScores: { minus: 0, zero: 0, prompted: 0, plus: 0 },
                allNotes: [],
                sessionHistory: [],
              });
            }

            const entry = programMap.get(programId)!;

            if (scores) {
              entry.aggregateScores.minus += scores.minus || 0;
              entry.aggregateScores.zero += scores.zero || 0;
              entry.aggregateScores.prompted += scores.prompted || 0;
              entry.aggregateScores.plus += scores.plus || 0;
            }

            if (notes && notes.trim()) {
              entry.allNotes.push(notes.trim());
            }

            entry.sessionHistory.push({
              sessionId: evt.id,
              date: sessionDate,
              scores: scores || { minus: 0, zero: 0, prompted: 0, plus: 0 },
              sessionType: evt.type || t('reports.client.therapy_default'),
              notes: notes,
            });
          });
        });

        // Convert map to array, sort session histories, filter empty
        const programsWithScoring = Array.from(programMap.values())
          .map(prog => ({
            ...prog,
            scoring: {
              aggregateScores: prog.aggregateScores,
              allNotes: prog.allNotes,
              sessionHistory: prog.sessionHistory.sort((a, b) => a.date.getTime() - b.date.getTime()),
            },
          }))
          .filter(p => p.sessionHistory.length > 0);

        setPrograms(programsWithScoring);

        // 8. Fetch Homework for this month
        const homeworkSnap = await getDocs(
          query(
            collection(db, "clients", clientId, "homework"),
            orderBy("createdAt", "desc")
          )
        );
        const allHomework = homeworkSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        // Filter client-side for items within the month
        const monthHomework = allHomework.filter(hw => {
          if (!hw.createdAt) return false;
          const created = typeof hw.createdAt === 'string'
            ? hw.createdAt
            : hw.createdAt.seconds
              ? new Date(hw.createdAt.seconds * 1000).toISOString()
              : '';
          return created >= monthStartISO && created <= monthEndISO;
        });
        setHomework(monthHomework);

        // 9. LOG REPORT GENERATION TO FIRESTORE
        const today = new Date().toISOString().split('T')[0];
        const dedupKey = `${today}-${month}`;
        const reportsRef = collection(db, "clients", clientId, "reports");

        const existingQuery = query(reportsRef, where("dateStr", "==", dedupKey));
        const existingSnap = await getDocs(existingQuery);

        if (existingSnap.empty) {
          await addDoc(reportsRef, {
            name: `Progress Report - ${new Date().toLocaleDateString('ro-RO')} (${month})`,
            type: "report",
            category: "report",
            generatedAt: serverTimestamp(),
            dateStr: dedupKey,
            reportMonth: month,
            sharedWithParent: false,
            clientId: clientId,
            clientName: clientData.name
          });
        }

      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setError(err.message || t('reports.client.error_default'));
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, [clientId, month]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
        <p className="text-neutral-500 font-medium tracking-tight font-display">{t('reports.client.loading')}</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 font-display uppercase tracking-wider text-sm">{t('reports.client.error_title')}</h1>
        <p className="text-neutral-500 max-w-md mb-6">{error || t('reports.client.error_default')}</p>
        <button
          onClick={() => router.back()}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <ClientReportHTML
      client={client}
      events={events}
      evaluations={evaluations}
      programs={programs}
      services={services}
      clinic={clinic}
      homework={homework}
      month={month}
      teamMembers={teamMembers}
      onBack={() => router.back()}
    />
  );
}
