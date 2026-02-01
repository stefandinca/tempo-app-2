"use client";

import { useTeamMembers } from "@/hooks/useCollections";
import { EventFormData } from "./types";
import { clsx } from "clsx";
import { Check } from "lucide-react";

interface StepTeamProps {
  data: EventFormData;
  updateData: (updates: Partial<EventFormData>) => void;
}

const EVENT_TYPES = [
  "ABA Session", "Speech Therapy", "Occupational Therapy", "Evaluation", "Parent Meeting"
];

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export default function StepTeam({ data, updateData }: StepTeamProps) {
  const { data: teamMembers } = useTeamMembers();

  const toggleTeamMember = (id: string) => {
    const current = data.selectedTeamMembers;
    const updated = current.includes(id) 
      ? current.filter(m => m !== id)
      : [...current, id];
    updateData({ selectedTeamMembers: updated });
  };

  const toggleRecurrenceDay = (dayIndex: number) => {
    const current = data.recurrenceDays;
    const updated = current.includes(dayIndex)
      ? current.filter(d => d !== dayIndex)
      : [...current, dayIndex];
    updateData({ recurrenceDays: updated });
  };

  return (
    <div className="space-y-6">
      
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
            Event Name
          </label>
          <input 
            type="text"
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
            placeholder="e.g. Morning Session"
            value={data.title}
            onChange={(e) => updateData({ title: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
            Service Type
          </label>
          <select 
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
            value={data.eventType}
            onChange={(e) => updateData({ eventType: e.target.value })}
          >
            {EVENT_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
            Date
          </label>
          <input 
            type="date"
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500"
            value={data.date}
            onChange={(e) => updateData({ date: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
            Start Time
          </label>
          <input 
            type="time"
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500"
            value={data.startTime}
            onChange={(e) => updateData({ startTime: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
            Duration (min)
          </label>
          <input 
            type="number"
            min="15"
            step="15"
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500"
            value={data.duration}
            onChange={(e) => updateData({ duration: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>

      {/* Recurrence */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Recurrence
          </label>
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isRecurring"
              checked={data.isRecurring}
              onChange={(e) => updateData({ isRecurring: e.target.checked })}
              className="rounded text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="isRecurring" className="text-sm text-neutral-500 cursor-pointer">Repeat weekly</label>
          </div>
        </div>
        
        {data.isRecurring && (
          <div className="flex gap-2 mt-2 animate-in slide-in-from-top-2">
            {DAYS.map((day, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleRecurrenceDay(i)}
                className={clsx(
                  "w-8 h-8 rounded-full text-xs font-medium transition-colors",
                  data.recurrenceDays.includes(i)
                    ? "bg-primary-500 text-white"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                {day}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Team Selection */}
      <div>
        <label className="block text-sm font-medium mb-3 text-neutral-700 dark:text-neutral-300">
          Assign Team Members
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto">
          {teamMembers.map(member => {
            const isSelected = data.selectedTeamMembers.includes(member.id);
            return (
              <div 
                key={member.id}
                onClick={() => toggleTeamMember(member.id)}
                className={clsx(
                  "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                  isSelected
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-medium"
                  style={{ backgroundColor: member.color || '#ccc' }}
                >
                  {member.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-neutral-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-neutral-500 truncate">{member.role}</p>
                </div>
                {isSelected && (
                  <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-white">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div>
        <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
          Optional Details
        </label>
        <textarea 
          className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors resize-none"
          rows={2}
          placeholder="Room number, special instructions..."
          value={data.details}
          onChange={(e) => updateData({ details: e.target.value })}
        />
      </div>

    </div>
  );
}
