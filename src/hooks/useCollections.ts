import { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  onSnapshot, 
  QueryConstraint, 
  doc, 
  getDoc, 
  DocumentData 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Generic Hook for Collections
export function useCollection<T = DocumentData>(
  collectionName: string, 
  constraints: QueryConstraint[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, collectionName), ...constraints);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const items: T[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as T);
        });
        setData(items);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName]); // Constraints omitted from dependency array to avoid loops, pass stable arrays if needed

  return { data, loading, error };
}

// Specific Hooks
export function useEvents() {
  return useCollection<any>("events");
}

export function useClients() {
  return useCollection<any>("clients");
}

export function useTeamMembers() {
  return useCollection<any>("team_members");
}
