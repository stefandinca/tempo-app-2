"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Loader2, AlertCircle } from "lucide-react";
import { useParentAuth } from "@/context/ParentAuthContext";
import { useTranslation } from "react-i18next";

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
    let unsubscribeVBMAPP: (() => void) | null = null;  // Hoisted to outer scope for proper cleanup

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

      // 5. Fetch Completed Evaluations (ABLLS and VB-MAPP)
      if (unsubscribeEvaluations) unsubscribeEvaluations();
      
      // We need to fetch both collections and merge them
      // Since we can't do a multi-collection query easily here without restructuring,
      // we'll set up two listeners and merge the state.
      
      const abllsQuery = query(
        collection(db, "clients", clientId, "evaluations"),
        where("status", "==", "completed")
      );

      const vbmappQuery = query(
        collection(db, "clients", clientId, "vbmapp_evaluations"),
        where("status", "==", "completed")
      );

      // Local state for merging
      let abllsData: any[] = [];
      let vbmappData: any[] = [];

      const updateEvaluations = () => {
        const merged = [...abllsData, ...vbmappData].sort((a, b) => {
          const dateA = new Date(a.completedAt || a.createdAt).getTime();
          const dateB = new Date(b.completedAt || b.createdAt).getTime();
          return dateB - dateA; // Descending
        });
        setEvaluations(merged);
        setLoading(false);
      };
      
      unsubscribeEvaluations = onSnapshot(abllsQuery, (snap) => {
        abllsData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateEvaluations();
      });

      unsubscribeVBMAPP = onSnapshot(vbmappQuery, (snap) => {
        vbmappData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateEvaluations();
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
      if (unsubscribeVBMAPP) unsubscribeVBMAPP();
    };
  }, [isAuthenticated, clientId, authLoading]);

  return { data, sessions, services, programs, evaluations, loading, error };
}

export function PortalLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-300">
      <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
      <p className="text-sm text-neutral-400">{t("common.loading")}</p>
    </div>
  );
}

export function PortalError({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6 animate-in fade-in duration-300">
      <div className="w-14 h-14 bg-error-50 dark:bg-error-900/20 rounded-full flex items-center justify-center mb-4">
        <AlertCircle className="w-7 h-7 text-error-500" />
      </div>
      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t("parent_portal.error.title")}</h3>
      <p className="text-neutral-400 text-sm mt-1 max-w-xs mx-auto">{message}</p>
      <a href="/parent" className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold rounded-xl transition-colors">
        {t("parent_portal.error.back_to_login")}
      </a>
    </div>
  );
}