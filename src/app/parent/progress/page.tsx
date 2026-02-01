"use client";

import { BarChart2 } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";

export default function ParentProgressPage() {
  const { data: client, loading, error } = usePortalData();

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || "Could not load progress data."} />;

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Child Progress</h1>
        <p className="text-neutral-500 text-sm">Visual tracking of developmental domains</p>
      </header>

      <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <BarChart2 className="w-8 h-8 text-neutral-300" />
        </div>
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No progress data</h3>
        <p className="text-neutral-500 text-sm mt-1">Progress charts for {client.name} will appear once assessments are completed.</p>
      </div>
    </div>
  );
}