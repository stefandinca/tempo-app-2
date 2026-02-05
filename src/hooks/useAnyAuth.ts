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
 * Checks ParentAuthContext first for parents, then falls back to AuthContext for staff.
 */
export function useAnyAuth(): AnyAuthResult {
  // Try parent auth (optional - won't throw if not in ParentAuthProvider)
  const parentAuth = useParentAuthOptional();

  // Try staff auth
  const staffAuth = useAuth();

  // Check parent auth first - if we are in parent portal context
  if (parentAuth?.user && parentAuth.isAuthenticated) {
    return {
      user: parentAuth.user,
      isParent: true,
      isStaff: false,
      loading: parentAuth.loading,
      role: 'Parent'
    };
  }

  // Fallback to staff auth
  if (staffAuth?.user && staffAuth.userRole) {
    return {
      user: staffAuth.user,
      isParent: false,
      isStaff: true,
      loading: staffAuth.loading,
      role: staffAuth.userRole
    };
  }

  // Check if current user is anonymous (parent) even if ParentAuthContext isn't fully ready
  if (staffAuth?.user?.isAnonymous) {
    return {
      user: staffAuth.user,
      isParent: true,
      isStaff: false,
      loading: staffAuth.loading,
      role: 'Parent'
    };
  }

  // Still loading or not authenticated
  const isLoading = staffAuth?.loading || (parentAuth?.loading ?? false);

  return {
    user: staffAuth?.user || parentAuth?.user || null,
    isParent: false,
    isStaff: false,
    loading: isLoading,
    role: null
  };
}
