"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { EventModalProvider } from "@/context/EventModalContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import CommandPalette from "@/components/CommandPalette";
import DashboardShell from "@/components/DashboardShell";
import { Loader2 } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth to finish loading
    if (loading) return;

    // If no user or no valid staff role, redirect to login
    if (!user || !userRole || !['Superadmin', 'Admin', 'Coordinator', 'Therapist'].includes(userRole)) {
      router.replace("/login");
    }
  }, [user, userRole, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // Don't render content if not authenticated
  if (!user || !userRole || !['Superadmin', 'Admin', 'Coordinator', 'Therapist'].includes(userRole)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-neutral-500">Authenticating staff...</p>
        </div>
      </div>
    );
  }

  return (
    <DataProvider>
      <EventModalProvider>
        <CommandPaletteProvider>
          <DashboardShell>
            {children}
          </DashboardShell>
          <CommandPalette />
        </CommandPaletteProvider>
      </EventModalProvider>
    </DataProvider>
  );
}
