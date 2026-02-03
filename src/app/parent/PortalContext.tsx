"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { Loader2, AlertCircle } from "lucide-react";

export function usePortalData() {
  const [data, setData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // First, restore Firebase auth state
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is already signed in
        console.log("[PortalContext] Auth restored, UID:", user.uid);
        setAuthReady(true);
      } else {
        // No user signed in - check if we have stored credentials
        const storedUid = typeof window !== 'undefined' ? localStorage.getItem("parent_uid") : null;
        const storedCode = typeof window !== 'undefined' ? localStorage.getItem("parent_client_code") : null;

        if (storedCode) {
          // We have a stored session, sign in anonymously again
          try {
            console.log("[PortalContext] Re-establishing anonymous auth...");
            const userCredential = await signInAnonymously(auth);
            const newUid = userCredential.user.uid;
            console.log("[PortalContext] New anonymous UID:", newUid);

            // Add the new UID to the client's parentUids array
            const storedClientId = localStorage.getItem("parent_client_id");
            if (storedClientId) {
              try {
                await updateDoc(doc(db, "clients", storedClientId), {
                  parentUids: arrayUnion(newUid)
                });
                console.log("[PortalContext] Added new UID to parentUids");
              } catch (updateErr) {
                console.error("[PortalContext] Failed to update parentUids:", updateErr);
                // Continue anyway - the UID might already be there from previous session
              }
            }

            localStorage.setItem("parent_uid", newUid);
            setAuthReady(true);
          } catch (err) {
            console.error("[PortalContext] Failed to restore auth:", err);
            setError("Authentication failed. Please log in again.");
            setLoading(false);
          }
        } else {
          // No stored session
          setAuthReady(true);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Then fetch data once auth is ready
  useEffect(() => {
    if (!authReady) return;

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
    let unsubscribePrograms: (() => void) | null = null;

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
      });

      // 4. Fetch Programs (for progress tracking)
      if (unsubscribePrograms) unsubscribePrograms();
      unsubscribePrograms = onSnapshot(collection(db, "programs"), (progSnap) => {
        const progItems: any[] = [];
        progSnap.forEach(doc => progItems.push({ id: doc.id, ...doc.data() }));
        setPrograms(progItems);
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
    };
  }, [authReady]);

  return { data, sessions, services, programs, loading, error };
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