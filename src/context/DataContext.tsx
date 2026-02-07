"use client";

import { createContext, useContext, useMemo } from "react";
import {
  useClients,
  useTeamMembers,
  useEvents,
  useServices,
  usePrograms
} from "@/hooks/useCollections";
import { collection, query, onSnapshot, collectionGroup, where } from "firebase/firestore";
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

  // Subscribe to all ACTIVE intervention plans across all clients via collectionGroup
  useEffect(() => {
    // We use collectionGroup to fetch ALL active plans in one go
    const q = query(
      collectionGroup(db, "interventionPlans"),
      where("status", "==", "active")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const plansMap: ActivePlansMap = {};
        
        // Map plans to their respective clients
        snapshot.forEach(doc => {
          const planData = { id: doc.id, ...doc.data() };
          // The parent of the plan subcollection doc is the client doc
          const clientId = doc.ref.parent.parent?.id;
          if (clientId) {
            plansMap[clientId] = planData;
          }
        });

        setActivePlans(plansMap);
        setActivePlansLoading(false);
      },
      (err) => {
        console.error(`Error fetching intervention plans via collectionGroup:`, err);
        setActivePlansLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Memoized helper functions
  const helpers = useMemo(() => ({
    getTeamMember: (id: string) => teamMembers.data.find(t => t.id === id),
    getClient: (id: string) => clients.data.find(c => c.id === id),
    getService: (id: string) => services.data.find(s => s.id === id),
    getClientEvents: (clientId: string) => events.data.filter(e => e.clientId === clientId),
    getClientActivePlan: (clientId: string) => activePlans[clientId] || null,
  }), [teamMembers.data, clients.data, services.data, events.data, activePlans]);

  const value = useMemo(() => ({
    clients,
    teamMembers,
    events,
    services,
    programs,
    activePlans,
    activePlansLoading,
    ...helpers
  }), [
    clients, 
    teamMembers, 
    events, 
    services, 
    programs, 
    activePlans, 
    activePlansLoading, 
    helpers
  ]);

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
