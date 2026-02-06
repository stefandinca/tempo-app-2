"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { 
  User, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  updateEmail,
  updatePassword,
  signInAnonymously as firebaseSignInAnonymously
} from "firebase/auth";
import { auth, db, IS_DEMO } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import i18n from "@/lib/i18n";

interface AuthContextType {
  user: User | null;
  userData: any | null;
  userRole: 'Admin' | 'Coordinator' | 'Therapist' | 'Parent' | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInAnonymous: () => Promise<void>;
  signOut: () => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
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

            // Apply language preference
            const userLang = data.language || 'ro';
            if (i18n.language !== userLang) {
              i18n.changeLanguage(userLang);
            }

            setLoading(false);
          } else {
            // Check if parent (parents might be in a different collection or just clients)
            // For now, let's check clients collection for parent access
            onSnapshot(doc(db, "clients", authUser.uid), (clientSnap) => {
               if (clientSnap.exists()) {
                 setUserData(clientSnap.data());
                 setUserRole('Parent');
               } else if (IS_DEMO && authUser.isAnonymous) {
                 // Mock data for demo users so they can see the app
                 setUserData({
                   name: "Demo Admin",
                   email: "demo@tempoapp.ro",
                   role: "Admin",
                   initials: "DA",
                   color: "#4A90E2"
                 });
                 setUserRole("Admin");
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

  const signInAnonymous = async () => {
    await firebaseSignInAnonymously(auth);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    router.push("/login");
  };

  const changeEmail = async (newEmail: string) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    await updateEmail(auth.currentUser, newEmail);
  };

  const changePassword = async (newPassword: string) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    await updatePassword(auth.currentUser, newPassword);
  };

  return (
    <AuthContext.Provider value={{ user, userData, userRole, loading, signIn, signInAnonymous, signOut, changeEmail, changePassword }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
