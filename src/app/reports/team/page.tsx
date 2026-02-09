"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  doc, 
  getDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import TeamReportHTML from "@/components/team/TeamReportHTML";
import { Loader2, AlertCircle } from "lucide-react";

function TeamReportContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const memberId = searchParams.get("id");

  const [member, setMember] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAllData() {
      if (!memberId) {
        setError("Missing team member ID");
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch Team Member Profile
        const memberDoc = await getDoc(doc(db, "team_members", memberId));
        if (!memberDoc.exists()) {
          setError("Team member not found");
          setLoading(false);
          return;
        }
        setMember({ id: memberDoc.id, ...memberDoc.data() });

        // 2. Fetch Clinic Settings
        const clinicDoc = await getDoc(doc(db, "system_settings", "config"));
        if (clinicDoc.exists()) {
          setClinic(clinicDoc.data().clinic);
        }

        // 3. Fetch All Clients (for mapping)
        const clientsSnap = await getDocs(collection(db, "clients"));
        setClients(clientsSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 4. Fetch All Services (for mapping)
        const servicesSnap = await getDocs(collection(db, "services"));
        setServices(servicesSnap.docs.map(d => ({ id: d.id, ...d.data() })));

        // 5. Fetch Session History (Events for this therapist)
        // Note: Firestore might require a composite index for this query if combined with orderBy
        // If it fails, I'll remove orderBy and sort in memory
        try {
          const eventsQuery = query(
            collection(db, "events"),
            where("therapistId", "==", memberId),
            orderBy("startTime", "desc")
          );
          const eventsSnap = await getDocs(eventsQuery);
          setEvents(eventsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (idxErr) {
          console.warn("Index missing for ordered events query, falling back to unsorted fetch");
          const eventsQuery = query(
            collection(db, "events"),
            where("therapistId", "==", memberId)
          );
          const eventsSnap = await getDocs(eventsQuery);
          const unsorted = eventsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          unsorted.sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
          setEvents(unsorted);
        }

      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setError(err.message || "Failed to load team data");
      } finally {
        setLoading(false);
      }
    }

    fetchAllData();
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
        <p className="text-neutral-500 font-medium tracking-tight font-display">Aggregating Team Performance Records...</p>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-6 text-center">
        <AlertCircle className="w-12 h-12 text-error-500 mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900 mb-2 font-display uppercase tracking-wider text-sm">Error</h1>
        <p className="text-neutral-500 max-w-md mb-6">{error || "The team member report could not be generated."}</p>
        <button 
          onClick={() => router.back()}
          className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold shadow-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <TeamReportHTML 
      member={member}
      events={events}
      clients={clients}
      services={services}
      clinic={clinic}
      onBack={() => router.back()}
    />
  );
}

export default function TeamReportPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    }>
      <TeamReportContent />
    </Suspense>
  );
}
