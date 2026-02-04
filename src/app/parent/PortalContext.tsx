"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Loader2, AlertCircle } from "lucide-react";
import { useParentAuth } from "@/context/ParentAuthContext";

export function usePortalData() {
  const { isAuthenticated, clientId, loading: authLoading } = useParentAuth();
  
  const [data, setData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync loading state with auth
  useEffect(() => {
    if (authLoading) {
      setLoading(true);
    }
  }, [authLoading]);

  // Fetch data once authenticated
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !clientId) {
      // If auth finished but not authenticated, we don't fetch data
      // The layout will redirect to login page
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // 1. Fetch Client Info (using ID directly now)
    const clientRef = collection(db, "clients");
    // We already have the ID, but let's subscribe to the doc to get updates
    const clientQuery = query(
        clientRef,
        where("__name__", "==", clientId) // Query by doc ID
    );

    let unsubscribeSessions: (() => void) | null = null;
    let unsubscribeServices: (() => void) | null = null;
    let unsubscribePrograms: (() => void) | null = null;
    let unsubscribeEvaluations: (() => void) | null = null;

    const unsubscribeClient = onSnapshot(clientQuery, (snapshot) => {
      if (snapshot.empty) {
        setError("Portal session invalid or expired.");
        setLoading(false);
        return;
      }

      const clientDoc = snapshot.docs[0];
      const clientInfo = { id: clientDoc.id, ...clientDoc.data() };
      setData(clientInfo);

      // 2. Fetch Client Sessions (Real-time)
      if (unsubscribeSessions) unsubscribeSessions();

      const sessionsQuery = query(
        collection(db, "events"),
        where("clientId", "==", clientId),
        orderBy("startTime", "asc")
      );

      unsubscribeSessions = onSnapshot(sessionsQuery, (sessSnap) => {
        const sessItems: any[] = [];
        sessSnap.forEach(doc => sessItems.push({ id: doc.id, ...doc.data() }));
        setSessions(sessItems);
      }, (err) => {
        console.error("Sessions fetch error:", err);
      });

      // 3. Fetch Services (for prices)
      if (unsubscribeServices) unsubscribeServices();
      unsubscribeServices = onSnapshot(collection(db, "services"), (servSnap) => {
        const servItems: any[] = [];
        servSnap.forEach(doc => servItems.push({ id: doc.id, ...doc.data() }));
        setServices(servItems);
      });

      // 4. Fetch Programs (for progress tracking)
      if (unsubscribePrograms) unsubscribePrograms();
      unsubscribePrograms = onSnapshot(collection(db, "programs"), (progSnap) => {
        const progItems: any[] = [];
        progSnap.forEach(doc => progItems.push({ id: doc.id, ...doc.data() }));
        setPrograms(progItems);
      });

      // 5. Fetch Completed Evaluations
      if (unsubscribeEvaluations) unsubscribeEvaluations();
      const evaluationsQuery = query(
        collection(db, "clients", clientId, "evaluations"),
        where("status", "==", "completed"),
        orderBy("completedAt", "desc")
      );
      
      unsubscribeEvaluations = onSnapshot(evaluationsQuery, (evalSnap) => {
        const evalItems: any[] = [];
        evalSnap.forEach(doc => evalItems.push({ id: doc.id, ...doc.data() }));
        setEvaluations(evalItems);
        setLoading(false);
      }, (err) => {
        console.error("Evaluations fetch error:", err);
        setLoading(false);
      });

    }, (err) => {
      console.error("Client fetch error:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => {
      unsubscribeClient();
      if (unsubscribeSessions) unsubscribeSessions();
      if (unsubscribeServices) unsubscribeServices();
      if (unsubscribePrograms) unsubscribePrograms();
      if (unsubscribeEvaluations) unsubscribeEvaluations();
    };
  }, [isAuthenticated, clientId, authLoading]);

  return { data, sessions, services, programs, evaluations, loading, error };
}

export function PortalLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
      <Loader2 className="w-10 h-10 animate-spin mb-4" />
      <p>Loading your portal...</p>
    </div>
  );
}

export function PortalError({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <div className="w-16 h-16 bg-error-50 dark:bg-error-900/20 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-error-500" />
      </div>
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Access Error</h3>
      <p className="text-neutral-500 text-sm mt-1 max-w-xs mx-auto">{message}</p>
      <a href="/parent" className="mt-6 text-primary-600 font-bold hover:underline">
        Back to Login
      </a>
    </div>
  );
}