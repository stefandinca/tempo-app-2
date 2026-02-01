"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  userData: any | null;
  userRole: 'Admin' | 'Coordinator' | 'Therapist' | 'Parent' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'Admin' | 'Coordinator' | 'Therapist' | 'Parent' | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeFromData: (() => void) | null = null;

    const unsubscribeFromAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      
      if (unsubscribeFromData) {
        unsubscribeFromData();
        unsubscribeFromData = null;
      }

      if (authUser) {
        // Try to find in team_members
        unsubscribeFromData = onSnapshot(doc(db, "team_members", authUser.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserData(data);
            setUserRole(data.role as any);
            setLoading(false);
          } else {
            // Check if parent (parents might be in a different collection or just clients)
            // For now, let's check clients collection for parent access
            onSnapshot(doc(db, "clients", authUser.uid), (clientSnap) => {
               if (clientSnap.exists()) {
                 setUserData(clientSnap.data());
                 setUserRole('Parent');
               } else {
                 setUserData(null);
                 setUserRole(null);
               }
               setLoading(false);
            });
          }
        });
      } else {
        setUserData(null);
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeFromAuth();
      if (unsubscribeFromData) unsubscribeFromData();
    };
  }, [router]);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, userData, userRole, loading, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
