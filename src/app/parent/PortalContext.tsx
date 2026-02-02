"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { Loader2, AlertCircle } from "lucide-react";

export function usePortalData() {
  const [data, setData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get code from localStorage
    const clientCode = typeof window !== 'undefined' ? localStorage.getItem("parent_client_code") : null;
    
    if (!clientCode) {
      setError("No client code found. Please log in.");
      setLoading(false);
      return;
    }

    // 1. Fetch Client Info
    const clientQuery = query(
      collection(db, "clients"),
      where("clientCode", "==", clientCode.toUpperCase())
    );

    let unsubscribeSessions: (() => void) | null = null;
    let unsubscribeServices: (() => void) | null = null;

    const unsubscribeClient = onSnapshot(clientQuery, (snapshot) => {
      if (snapshot.empty) {
        setError("Portal session invalid or expired.");
        setLoading(false);
        return;
      }
      
      const clientDoc = snapshot.docs[0];
      const clientId = clientDoc.id;
      const clientInfo = { id: clientId, ...clientDoc.data() };
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
    };
  }, []);

  return { data, sessions, services, loading, error };
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