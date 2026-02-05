"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import EvaluationReportHTML from "@/components/evaluations/EvaluationReportHTML";
import { Evaluation } from "@/types/evaluation";
import { VBMAPPEvaluation } from "@/types/vbmapp";
import { ClientInfo } from "@/types/client";
import { Loader2 } from "lucide-react";

export default function EvaluationReportPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const type = searchParams.get("type"); // 'ablls' or 'vbmapp'
  const id = searchParams.get("id");
  const clientId = searchParams.get("clientId");
  const isParent = searchParams.get("mode") === "parent";

  const [evaluation, setEvaluation] = useState<Evaluation | VBMAPPEvaluation | null>(null);
  const [client, setClient] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!id || !clientId || !type) {
        setError("Invalid report URL parameters. Missing ID, Type, or ClientID.");
        setLoading(false);
        return;
      }

      try {
        // Fetch Client
        const clientDoc = await getDoc(doc(db, "clients", clientId));
        if (!clientDoc.exists()) {
          setError("Client not found");
          setLoading(false);
          return;
        }
        setClient({ id: clientDoc.id, ...clientDoc.data() } as ClientInfo);

        // Fetch Evaluation
        const collectionName = type.toLowerCase() === "ablls" ? "evaluations" : "vbmapp_evaluations";
        const evalDoc = await getDoc(doc(db, "clients", clientId, collectionName, id));
        
        if (!evalDoc.exists()) {
          setError("Evaluation report not found");
        } else {
          setEvaluation({ id: evalDoc.id, ...evalDoc.data() } as any);
        }
      } catch (err: any) {
        console.error("Error fetching report data:", err);
        setError(err.message || "Failed to load report data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [id, clientId, type]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
        <p className="text-neutral-500 font-medium tracking-tight">Preparing high-fidelity report...</p>
      </div>
    );
  }

  if (error || !evaluation || !client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-50 p-6 text-center">
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Report Not Available</h1>
        <p className="text-neutral-500 max-w-md mb-6">{error || "The requested evaluation report could not be found."}</p>
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
    <EvaluationReportHTML 
      evaluation={evaluation} 
      client={client} 
      isParentVersion={isParent}
      onBack={() => router.back()}
    />
  );
}
