"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { User, onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

interface ParentAuthContextType {
  user: User | null;
  clientId: string | null;
  clientName: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  authenticateWithCode: (clientId: string, clientName: string, clientCode: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const ParentAuthContext = createContext<ParentAuthContextType | undefined>(undefined);

export function ParentAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser?.isAnonymous) {
        // User is logged in anonymously
        setUser(authUser);

        // Check if we have stored session info
        const storedClientId = sessionStorage.getItem("parent_client_id");
        const storedClientName = sessionStorage.getItem("parent_client_name");
        const storedParentUid = sessionStorage.getItem("parent_uid");

        if (storedClientId) {
          // If the UID has changed (e.g. new session), we need to re-register it with the client
          if (storedParentUid !== authUser.uid) {
            console.log("[ParentAuth] UID mismatch or new session. Re-registering with client...");
            try {
              const clientRef = doc(db, "clients", storedClientId);
              await updateDoc(clientRef, {
                parentUids: arrayUnion(authUser.uid)
              });
              console.log("[ParentAuth] Re-registered successfully.");
              sessionStorage.setItem("parent_uid", authUser.uid);
            } catch (err) {
              console.error("[ParentAuth] Failed to re-register UID with client:", err);
              // We continue anyway, as the user might already be in the list
              // or the update might fail due to permissions if they aren't (catch-22 handled by logic flow)
            }
          }

          // Restore session state
          setClientId(storedClientId);
          setClientName(storedClientName);
        } else {
          // No stored client info, clear state
          setClientId(null);
          setClientName(null);
        }
        setLoading(false);
      } else {
        // Not logged in (or not anonymous)
        // Check if we should auto-login based on stored credentials
        const storedCode = sessionStorage.getItem("parent_client_code");
        
        if (storedCode && !authUser) {
          console.log("[ParentAuth] No active session, but found stored code. Auto-logging in...");
          try {
            await signInAnonymously(auth);
            // The listener will fire again with the new user
            return;
          } catch (err) {
            console.error("[ParentAuth] Auto-login failed:", err);
            setLoading(false);
          }
        } else {
          // No stored code, or logged in as non-anonymous (which shouldn't happen in parent portal usually)
          setUser(null);
          setClientId(null);
          setClientName(null);
          setLoading(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Authenticate with client code (called after code validation)
  const authenticateWithCode = useCallback(async (validatedClientId: string, validatedClientName: string, validatedClientCode: string) => {
    try {
      // Sign in anonymously if not already
      let currentUser = auth.currentUser;

      if (!currentUser || !currentUser.isAnonymous) {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
      }

      // Link anonymous UID to client document
      const clientRef = doc(db, "clients", validatedClientId);
      await updateDoc(clientRef, {
        parentUids: arrayUnion(currentUser.uid)
      });

      // Store session info (sessionStorage - cleared when tab closes)
      sessionStorage.setItem("parent_uid", currentUser.uid);
      sessionStorage.setItem("parent_client_id", validatedClientId);
      sessionStorage.setItem("parent_client_name", validatedClientName);
      sessionStorage.setItem("parent_client_code", validatedClientCode.toUpperCase());

      setUser(currentUser);
      setClientId(validatedClientId);
      setClientName(validatedClientName);

      console.log("[ParentAuth] Successfully authenticated parent with UID:", currentUser.uid);
    } catch (err) {
      console.error("[ParentAuth] Error authenticating:", err);
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      // Clear session storage
      sessionStorage.removeItem("parent_uid");
      sessionStorage.removeItem("parent_client_id");
      sessionStorage.removeItem("parent_client_name");
      sessionStorage.removeItem("parent_client_code");

      // Sign out from Firebase
      await firebaseSignOut(auth);

      setUser(null);
      setClientId(null);
      setClientName(null);
    } catch (err) {
      console.error("[ParentAuth] Error signing out:", err);
    }
  }, []);

  const isAuthenticated = user !== null && clientId !== null;

  // Idle timeout: auto sign-out after 30 minutes of inactivity
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    if (!isAuthenticated) return;

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        console.log("[ParentAuth] Idle timeout reached. Signing out...");
        signOut();
      }, IDLE_TIMEOUT_MS);
    };

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    events.forEach(e => window.addEventListener(e, resetIdleTimer, { passive: true }));
    resetIdleTimer(); // Start the timer

    return () => {
      events.forEach(e => window.removeEventListener(e, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isAuthenticated, signOut]);

  return (
    <ParentAuthContext.Provider
      value={{
        user,
        clientId,
        clientName,
        loading,
        isAuthenticated,
        authenticateWithCode,
        signOut
      }}
    >
      {children}
    </ParentAuthContext.Provider>
  );
}

export function useParentAuth() {
  const context = useContext(ParentAuthContext);
  if (context === undefined) {
    throw new Error("useParentAuth must be used within ParentAuthProvider");
  }
  return context;
}

// Optional hook that doesn't throw - useful for conditional checks
export function useParentAuthOptional() {
  return useContext(ParentAuthContext);
}
