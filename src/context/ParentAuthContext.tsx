"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";

interface ParentAuthContextType {
  user: User | null;
  clientId: string | null;
  clientName: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  authenticateWithCode: (clientId: string, clientName: string) => Promise<void>;
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
      // Only handle anonymous users in parent context
      if (authUser?.isAnonymous) {
        setUser(authUser);

        // Restore session from localStorage
        const storedClientId = localStorage.getItem("parent_client_id");
        const storedClientName = localStorage.getItem("parent_client_name");
        const storedParentUid = localStorage.getItem("parent_uid");

        // Verify the stored UID matches current auth user
        if (storedClientId && storedParentUid === authUser.uid) {
          setClientId(storedClientId);
          setClientName(storedClientName);
        } else {
          // UID mismatch - clear stale session
          setClientId(null);
          setClientName(null);
        }
      } else {
        // Not an anonymous user - don't set user in parent context
        setUser(null);
        setClientId(null);
        setClientName(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Authenticate with client code (called after code validation)
  const authenticateWithCode = useCallback(async (validatedClientId: string, validatedClientName: string) => {
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

      // Store session info
      localStorage.setItem("parent_uid", currentUser.uid);
      localStorage.setItem("parent_client_id", validatedClientId);
      localStorage.setItem("parent_client_name", validatedClientName);

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
      // Clear local storage
      localStorage.removeItem("parent_uid");
      localStorage.removeItem("parent_client_id");
      localStorage.removeItem("parent_client_name");
      localStorage.removeItem("parent_client_code");

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
