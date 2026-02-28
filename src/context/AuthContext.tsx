"use client";

import { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  signInWithPopup,
  GoogleAuthProvider,
  updateEmail,
  updatePassword,
  signInAnonymously as firebaseSignInAnonymously
} from "firebase/auth";
import { auth, db, IS_DEMO } from "@/lib/firebase";
import { doc, getDoc, onSnapshot, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useRouter } from "next/navigation";
import i18n from "@/lib/i18n";

interface AuthContextType {
  user: User | null;
  userData: any | null;
  userRole: 'Superadmin' | 'Admin' | 'Coordinator' | 'Therapist' | 'Parent' | null;
  loading: boolean;
  authError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAnonymous: () => Promise<void>;
  signOut: () => Promise<void>;
  changeEmail: (newEmail: string) => Promise<void>;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'Superadmin' | 'Admin' | 'Coordinator' | 'Therapist' | 'Parent' | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    let unsubscribeFromData: (() => void) | null = null;
    let unsubscribeFromClientData: (() => void) | null = null;

    const unsubscribeFromAuth = onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      setAuthError(null);

      if (unsubscribeFromData) {
        unsubscribeFromData();
        unsubscribeFromData = null;
      }
      if (unsubscribeFromClientData) {
        unsubscribeFromClientData();
        unsubscribeFromClientData = null;
      }

      if (authUser) {
        // Set loading while we fetch user data to prevent premature redirects
        setLoading(true);

        console.log("[Auth Debug] User signed in:", {
          uid: authUser.uid,
          email: authUser.email,
          providers: authUser.providerData.map(p => p.providerId),
        });

        // Try to find in team_members by UID
        unsubscribeFromData = onSnapshot(doc(db, "team_members", authUser.uid), async (docSnap) => {
          console.log("[Auth Debug] team_members/" + authUser.uid + " exists:", docSnap.exists());
          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("[Auth Debug] team_members data:", { role: data.role, name: data.name, inviteStatus: data.inviteStatus });
            setUserData(data);
            // Normalize role to capitalized format (e.g., 'superadmin' → 'Superadmin')
            // This ensures all role checks in the app work regardless of DB capitalization
            const normalizedRole = data.role
              ? data.role.charAt(0).toUpperCase() + data.role.slice(1).toLowerCase()
              : null;
            console.log("[Auth Debug] Setting userRole to:", normalizedRole);
            setUserRole(normalizedRole as any);

            // Apply language preference
            const userLang = data.language || 'ro';
            if (i18n.language !== userLang) {
              i18n.changeLanguage(userLang);
            }

            // Auto-update inviteStatus from "pending" to "active" on successful login
            if (data.inviteStatus === "pending") {
              try {
                await updateDoc(doc(db, "team_members", authUser.uid), {
                  inviteStatus: "active"
                });
              } catch (err) {
                console.error("Failed to update inviteStatus:", err);
              }
            }

            setLoading(false);
          } else {
            // UID not found in team_members
            // If user signed in via Google, check if their email exists in team_members (old doc with wrong ID)
            const isGoogleUser = authUser.providerData.some(p => p.providerId === "google.com");
            if (isGoogleUser && authUser.email) {
              try {
                const emailQuery = query(
                  collection(db, "team_members"),
                  where("email", "==", authUser.email.toLowerCase())
                );
                const emailSnap = await getDocs(emailQuery);
                if (!emailSnap.empty) {
                  // Found by email but not by UID — needs migration
                  setAuthError("account_needs_migration");
                  setUserData(null);
                  setUserRole(null);
                  setLoading(false);
                  await firebaseSignOut(auth);
                  return;
                }
              } catch (err) {
                console.error("Error checking email in team_members:", err);
              }

              // Not found at all — not a registered team member
              setAuthError("google_not_authorized");
              setUserData(null);
              setUserRole(null);
              setLoading(false);
              await firebaseSignOut(auth);
              return;
            }

            // Check if parent (parents might be in a different collection or just clients)
            unsubscribeFromClientData = onSnapshot(doc(db, "clients", authUser.uid), (clientSnap) => {
               if (clientSnap.exists()) {
                 setUserData(clientSnap.data());
                 setUserRole('Parent');
               } else if (IS_DEMO && authUser.isAnonymous) {
                 // Mock data for demo users - works in both dev and production
                 setUserData({
                   name: "Demo Admin",
                   email: "demo@tempoapp.ro",
                   role: "Admin",
                   initials: "DA",
                   color: "#4A90E2",
                   isDemo: true
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
      if (unsubscribeFromClientData) unsubscribeFromClientData();
    };
    // Auth listener should only be set up once on mount — router is stable in Next.js App Router
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signInWithGoogleFn = useCallback(async () => {
    setAuthError(null);
    await signInWithPopup(auth, googleProvider);
    // onAuthStateChanged will handle the rest (UID lookup, email fallback, etc.)
  }, []);

  const signInAnonymous = useCallback(async () => {
    await firebaseSignInAnonymously(auth);
  }, []);

  const signOut = useCallback(async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
    router.push("/login");
  }, [router]);

  const changeEmail = useCallback(async (newEmail: string) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    await updateEmail(auth.currentUser, newEmail);
  }, []);

  const changePassword = useCallback(async (newPassword: string) => {
    if (!auth.currentUser) throw new Error("No user logged in");
    await updatePassword(auth.currentUser, newPassword);
  }, []);

  const value = useMemo(() => ({
    user, userData, userRole, loading, authError, signIn, signInWithGoogle: signInWithGoogleFn, signInAnonymous, signOut, changeEmail, changePassword
  }), [user, userData, userRole, loading, authError, signIn, signInWithGoogleFn, signInAnonymous, signOut, changeEmail, changePassword]);

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
