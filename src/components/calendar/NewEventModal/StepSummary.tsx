"use client";

import { EventFormData, MOCK_PROGRAMS } from "./types";
import { useClients, useTeamMembers, useServices } from "@/hooks/useCollections";
import { Calendar, Clock, User, BookOpen, Repeat } from "lucide-react";

interface StepSummaryProps {
  data: EventFormData;
}

export default function StepSummary({ data }: StepSummaryProps) {
  const { data: clients } = useClients();
  const { data: teamMembers } = useTeamMembers();
  const { data: services } = useServices();

  const selectedClients = clients.filter(c => data.selectedClients.includes(c.id));
  const selectedTeam = teamMembers.filter(t => data.selectedTeamMembers.includes(t.id));
  const selectedPrograms = MOCK_PROGRAMS.filter(p => data.selectedPrograms.includes(p.id));
  const selectedService = services.find(s => s.id === data.eventType);

  return (
    <div className="space-y-6">
      
      {/* Event Header */}
      <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/50">
        <h3 className="text-lg font-bold text-primary-900 dark:text-primary-100">{data.title || "Untitled Event"}</h3>
        <p className="text-sm text-primary-700 dark:text-primary-300">
          {selectedService?.label || "No service selected"}
          {selectedService?.isBillable && selectedService?.basePrice > 0 && (
            <span className="ml-2 text-xs bg-primary-100 dark:bg-primary-800 px-2 py-0.5 rounded-full">
              {selectedService.basePrice} RON
            </span>
          )}
        </p>
        
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <Calendar className="w-4 h-4 text-primary-500" />
            <span>{new Date(data.date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <Clock className="w-4 h-4 text-primary-500" />
            <span>{data.startTime} ({data.duration} min)</span>
          </div>
          {data.isRecurring && (
            <div className="col-span-2 flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
              <Repeat className="w-4 h-4 text-primary-500" />
              <span>Recurring Weekly</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* People */}
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Team</h4>
            {selectedTeam.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {selectedTeam.map(t => (
                  <div key={t.id} className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-xs font-medium">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: t.color }}></div>
                    {t.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No team members selected</p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Clients</h4>
            {selectedClients.length > 0 ? (
              <div className="space-y-2">
                {selectedClients.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                    <User className="w-4 h-4 text-neutral-400" />
                    {c.name}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-400 italic">No clients selected</p>
            )}
          </div>
        </div>

        {/* Programs */}
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Programs</h4>
          {selectedPrograms.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {selectedPrograms.map(p => (
                <div key={p.id} className="flex items-start gap-2 p-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                  <BookOpen className="w-4 h-4 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-neutral-900 dark:text-white">{p.title}</p>
                    <p className="text-[10px] text-neutral-500">{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-neutral-400 italic">No programs selected</p>
          )}
        </div>
      </div>

      {data.details && (
        <div>
          <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-1">Notes</h4>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 italic">
            &ldquo;{data.details}&rdquo;
          </p>
        </div>
      )}
    </div>
  );
}
