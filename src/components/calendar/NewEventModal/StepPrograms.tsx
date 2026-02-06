"use client";

import { useState, useEffect, useRef } from "react";
import { EventFormData } from "./types";
import { Search, Check, BookOpen, Loader2, Info, Target } from "lucide-react";
import { clsx } from "clsx";
import { usePrograms, useInterventionPlans } from "@/hooks/useCollections";
import { useTranslation } from "react-i18next";

interface StepProgramsProps {
  data: EventFormData;
  updateData: (updates: Partial<EventFormData>) => void;
}

export default function StepPrograms({ data, updateData }: StepProgramsProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const { data: programs, loading } = usePrograms();

  // Get intervention plans for selected client
  const clientId = data.selectedClients[0] || "";
  const { data: plans, getActivePlanForDate } = useInterventionPlans(clientId);

  // Track if we've auto-populated to avoid re-triggering
  const hasAutoPopulated = useRef(false);
  const previousClientId = useRef<string>("");

  // Find active plan for the event date
  const eventDate = data.date ? new Date(data.date) : new Date();
  const activePlan = clientId ? getActivePlanForDate(eventDate) : null;

  // Auto-populate programs from active plan when client changes or plans load
  useEffect(() => {
    // Reset if client changed
    if (previousClientId.current !== clientId) {
      hasAutoPopulated.current = false;
      previousClientId.current = clientId;
    }

    // Auto-populate if we have an active plan and haven't done so yet
    if (activePlan && !hasAutoPopulated.current && data.selectedPrograms.length === 0) {
      updateData({ selectedPrograms: [...activePlan.programIds] });
      hasAutoPopulated.current = true;
    }
  }, [activePlan, clientId, data.selectedPrograms.length, updateData]);

  const filteredPrograms = (programs || []).filter(prog =>
    prog.title.toLowerCase().includes(search.toLowerCase()) ||
    (prog.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleProgram = (id: string) => {
    const current = data.selectedPrograms;
    const updated = current.includes(id)
      ? current.filter(p => p !== id)
      : [...current, id];
    updateData({ selectedPrograms: updated });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(i18n.language === 'ro' ? 'ro-RO' : 'en-US', {
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="space-y-4">
      {/* Active Plan Indicator */}
      {activePlan && (
        <div className="flex items-start gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
            <Target className="w-4 h-4 text-primary-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
              {t('event_modal.programs_auto_selected', { count: activePlan.programIds.length })}
            </p>
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">
              &quot;{activePlan.name}&quot; ({formatDate(activePlan.startDate)} - {formatDate(activePlan.endDate)})
            </p>
          </div>
        </div>
      )}

      {/* Header & Search */}
      <div className="flex flex-col gap-3">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {t('event_modal.select_programs')}
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder={t('event_modal.search_programs')}
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
            <p className="text-sm">{t('common.loading')}</p>
          </div>
        ) : filteredPrograms.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            {t('event_modal.no_programs_found', { search })}
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
        {data.selectedPrograms.length === 1 
          ? t('event_modal.selected_count_one') 
          : t('event_modal.selected_count', { count: data.selectedPrograms.length })}
      </p>
    </div>
  );
}
