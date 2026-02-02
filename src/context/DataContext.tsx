"use client";

import { createContext, useContext, useMemo } from "react";
import {
  useClients,
  useTeamMembers,
  useEvents,
  useServices,
  usePrograms
} from "@/hooks/useCollections";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";

interface CollectionState<T = any> {
  data: T[];
  loading: boolean;
  error: string | null;
}

interface ActivePlansMap {
  [clientId: string]: any | null;
}

interface DataContextType {
  clients: CollectionState;
  teamMembers: CollectionState;
  events: CollectionState;
  services: CollectionState;
  programs: CollectionState;
  activePlans: ActivePlansMap;
  activePlansLoading: boolean;
  // Helper functions
  getTeamMember: (id: string) => any | undefined;
  getClient: (id: string) => any | undefined;
  getService: (id: string) => any | undefined;
  getClientEvents: (clientId: string) => any[];
  getClientActivePlan: (clientId: string) => any | null;
}

const DataContext = createContext<DataContextType>({} as DataContextType);

export function DataProvider({ children }: { children: React.ReactNode }) {
  // Core collections - single subscription each
  const clients = useClients();
  const teamMembers = useTeamMembers();
  const events = useEvents();
  const services = useServices();
  const programs = usePrograms();

  // Batch fetch all intervention plans for all clients
  const [activePlans, setActivePlans] = useState<ActivePlansMap>({});
  const [activePlansLoading, setActivePlansLoading] = useState(true);

  // Subscribe to all intervention plans across all clients
  useEffect(() => {
    if (clients.loading || clients.data.length === 0) {
      setActivePlansLoading(clients.loading);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    const plansMap: ActivePlansMap = {};

    // Initialize all clients with null
    clients.data.forEach(client => {
      plansMap[client.id] = null;
    });

    let loadedCount = 0;
    const totalClients = clients.data.length;

    clients.data.forEach(client => {
      const q = query(collection(db, "clients", client.id, "interventionPlans"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const plans: any[] = [];
          snapshot.forEach(doc => {
            plans.push({ id: doc.id, ...doc.data() });
          });

          // Find active plan
          const activePlan = plans.find(p => p.status === "active") || null;

          setActivePlans(prev => ({
            ...prev,
            [client.id]: activePlan
          }));

          loadedCount++;
          if (loadedCount >= totalClients) {
            setActivePlansLoading(false);
          }
        },
        (err) => {
          console.error(`Error fetching plans for ${client.id}:`, err);
          loadedCount++;
          if (loadedCount >= totalClients) {
            setActivePlansLoading(false);
          }
        }
      );

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [clients.data, clients.loading]);

  // Memoized helper functions
  const helpers = useMemo(() => ({
    getTeamMember: (id: string) => teamMembers.data.find(t => t.id === id),
    getClient: (id: string) => clients.data.find(c => c.id === id),
    getService: (id: string) => services.data.find(s => s.id === id),
    getClientEvents: (clientId: string) => events.data.filter(e => e.clientId === clientId),
    getClientActivePlan: (clientId: string) => activePlans[clientId] || null,
  }), [teamMembers.data, clients.data, services.data, events.data, activePlans]);

  const value: DataContextType = {
    clients,
    teamMembers,
    events,
    services,
    programs,
    activePlans,
    activePlansLoading,
    ...helpers
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
