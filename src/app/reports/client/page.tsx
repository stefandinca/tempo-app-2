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

export default function ClientReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const clientId = searchParams.get("id");

  const [client, setClient] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      if (!clientId) {
        setError("Missing client ID");
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Client Profile
        const clientDoc = await getDoc(doc(db, "clients", clientId));
        if (!clientDoc.exists()) {
          setError("Client not found");
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

        // 5. Fetch Session History (Events)
        const eventsQuery = query(
          collection(db, "events"),
          where("clientId", "==", clientId),
          orderBy("startTime", "desc")
        );
        const eventsSnap = await getDocs(eventsQuery);
        const rawEvents = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
        
        // Map names to events if missing
        const mappedEvents = rawEvents.map(evt => ({
          ...evt,
          therapistName: evt.therapistName || teamData.find(tm => tm.id === evt.therapistId)?.name || "Staff Member"
        }));
        setEvents(mappedEvents);

        // 6. Fetch Evaluations (ABLLS)
        const evalsQuery = query(
          collection(db, "clients", clientId, "evaluations"),
          orderBy("createdAt", "desc")
        );
        const evalsSnap = await getDocs(evalsQuery);
        setEvaluations(evalsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 5. Fetch Active Programs (from last intervention plan)
        const plansQuery = query(
          collection(db, "clients", clientId, "interventionPlans"),
          where("status", "==", "active"),
          orderBy("createdAt", "desc")
        );
        const plansSnap = await getDocs(plansQuery);
        if (!plansSnap.empty) {
          const plan = plansSnap.docs[0].data();
          const progsSnap = await getDocs(collection(db, "programs"));
          const allProgs = progsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          setPrograms(allProgs.filter(p => plan.programIds?.includes(p.id)));
        }

        // 6. LOG REPORT GENERATION TO FIRESTORE
        // This makes it visible in the Documents tab
        const today = new Date().toISOString().split('T')[0];
        const reportsRef = collection(db, "clients", clientId, "reports");
        
        // We only log it once per day to avoid duplicates on refresh
        const existingQuery = query(reportsRef, where("dateStr", "==", today));
        const existingSnap = await getDocs(existingQuery);

        if (existingSnap.empty) {
          await addDoc(reportsRef, {
            name: `Progress Report - ${new Date().toLocaleDateString('ro-RO')}`,
            type: "report",
            category: "report",
            generatedAt: serverTimestamp(),
            dateStr: today,
            sharedWithParent: false,
            clientId: clientId,
            clientName: clientData.name
          });
        }

      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setError(err.message || "Failed to load clinical data");
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
        <p className="text-neutral-500 font-medium tracking-tight font-display">Compiling Clinical Records...</p>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 font-display uppercase tracking-wider text-sm">Access Denied</h1>
        <p className="text-neutral-500 max-w-md mb-6">{error || "The client report could not be generated."}</p>
        <button 
          onClick={() => router.back()}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold"
        >
          Go Back
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
      onBack={() => router.back()}
    />
  );
}