"use client";

import { usePrograms } from "@/hooks/useCollections";
import { BookOpen, Loader2, Plus } from "lucide-react";

interface ClientProgramsTabProps {
  client: any;
}

export default function ClientProgramsTab({ client }: ClientProgramsTabProps) {
  const { data: programs, loading } = usePrograms();
  const clientPrograms = (programs || []).filter(p => client.programIds?.includes(p.id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-500">
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p>Loading programs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Assigned Programs</h3>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-colors">
          <Plus className="w-4 h-4" />
          Assign Program
        </button>
      </div>

      {clientPrograms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {clientPrograms.map((program) => (
            <div 
              key={program.id}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm hover:border-primary-500/50 transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center text-primary-600 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-neutral-900 dark:text-white">{program.title}</h4>
                  <p className="text-sm text-neutral-500 mt-1 line-clamp-2">
                    {program.description || "No description provided for this program."}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs font-medium px-2 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-lg">
                      Status: Active
                    </span>
                    <button className="text-sm font-bold text-primary-600 hover:underline">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No programs assigned</h3>
          <p className="text-neutral-500 mt-1 max-w-sm mx-auto">
            This client doesn&apos;t have any therapy programs assigned yet. 
            Click the button above to start assigning programs.
          </p>
        </div>
      )}
    </div>
  );
}
