"use client";

import { useState } from "react";
import { EventFormData } from "./types";
import { Search, Check, BookOpen, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { usePrograms } from "@/hooks/useCollections";

interface StepProgramsProps {
  data: EventFormData;
  updateData: (updates: Partial<EventFormData>) => void;
}

export default function StepPrograms({ data, updateData }: StepProgramsProps) {
  const [search, setSearch] = useState("");
  const { data: programs, loading } = usePrograms();

  const filteredPrograms = (programs || []).filter(prog => 
    prog.title.toLowerCase().includes(search.toLowerCase()) ||
    prog.description.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProgram = (id: string) => {
    const current = data.selectedPrograms;
    const updated = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id];
    updateData({ selectedPrograms: updated });
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Select Programs
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search programs..." 
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Program List */}
      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-500">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p className="text-sm">Loading programs...</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No programs found matching &quot;{search}&quot;
          </div>
        ) : (
          filteredPrograms.map(prog => {
            const isSelected = data.selectedPrograms.includes(prog.id);
            return (
              <div 
                key={prog.id}
                onClick={() => toggleProgram(prog.id)}
                className={clsx(
                  "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all group",
                  isSelected
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}
              >
                <div className="mt-0.5">
                  <div className={clsx(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    isSelected
                      ? "bg-primary-500 border-primary-500 text-white"
                      : "border-neutral-300 dark:border-neutral-600 group-hover:border-primary-400"
                  )}>
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-sm text-neutral-900 dark:text-white flex items-center gap-2">
                    <BookOpen className="w-3 h-3 text-neutral-400" />
                    {prog.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-0.5">{prog.description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <p className="text-xs text-neutral-500 text-right">
        {data.selectedPrograms.length} selected
      </p>
    </div>
  );
}
