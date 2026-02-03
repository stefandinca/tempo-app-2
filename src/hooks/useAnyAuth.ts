"use client";

import { User } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";
import { useParentAuthOptional } from "@/context/ParentAuthContext";

interface AnyAuthResult {
  user: User | null;
  isParent: boolean;
  isStaff: boolean;
  loading: boolean;
  role: string | null;
}

/**
 * Universal auth hook that works for both staff and parents.
 * Checks AuthContext first (staff), then falls back to ParentAuthContext (parents).
 * Returns { user, isParent, isStaff, loading, role } for NotificationContext and other consumers.
 */
export function useAnyAuth(): AnyAuthResult {
  // Try staff auth first
  const staffAuth = useAuth();

  // Try parent auth (optional - won't throw if not in ParentAuthProvider)
  const parentAuth = useParentAuthOptional();

  // Staff takes precedence
  if (staffAuth?.user && !staffAuth.loading) {
    return {
      user: staffAuth.user,
      isParent: false,
      isStaff: true,
      loading: false,
      role: staffAuth.userRole
    };
  }

  // Check parent auth
  if (parentAuth?.user && parentAuth.isAuthenticated && !parentAuth.loading) {
    return {
      user: parentAuth.user,
      isParent: true,
      isStaff: false,
      loading: false,
      role: 'Parent'
    };
  }

  // Still loading
  const isLoading = staffAuth?.loading || parentAuth?.loading || false;

  return {
    user: null,
    isParent: false,
    isStaff: false,
    loading: isLoading,
    role: null
  };
}
