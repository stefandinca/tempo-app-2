"use client";

import { MoreVertical, User, Calendar, TrendingUp } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { useTeamMembers } from "@/hooks/useCollections";

export interface Client {
  id: string;
  name: string;
  age: number;
  progress: number;
  medicalInfo?: string;
  parentName?: string;
  parentEmail?: string;
  assignedTherapistId?: string;
  createdAt?: string;
  isArchived?: boolean;
}

interface ClientCardProps {
  client: Client;
}

export default function ClientCard({ client }: ClientCardProps) {
  const { data: teamMembers } = useTeamMembers();
  
  const therapist = teamMembers.find(t => t.id === client.assignedTherapistId);
  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // Progress color logic
  const progressColor = client.progress >= 80 ? 'bg-success-500' : client.progress >= 60 ? 'bg-warning-500' : 'bg-error-500';

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col h-full">
      {/* Top Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white dark:border-neutral-800 shadow-sm">
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white leading-tight">{client.name}</h3>
            <p className="text-xs text-neutral-500">Age: {client.age} years • Since: Jan 2024</p>
          </div>
        </div>
        <button className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4 flex-1">
        {/* Therapist */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <User className="w-4 h-4 text-neutral-400" />
          <div className="flex items-center gap-1.5">
            {therapist ? (
              <>
                <div 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                  style={{ backgroundColor: therapist.color }}
                >
                  {therapist.initials}
                </div>
                <span className="font-medium truncate">{therapist.name}</span>
              </>
            ) : (
              <span className="italic text-neutral-400">Unassigned</span>
            )}
          </div>
        </div>

        {/* Next Session Placeholder */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <span className="truncate">Next: <span className="font-medium text-neutral-900 dark:text-white">Tomorrow, 9:00 AM</span></span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <div className="flex items-center gap-1 text-neutral-500">
              <TrendingUp className="w-3 h-3" />
              <span>Overall Progress</span>
            </div>
            <span className="font-bold text-neutral-900 dark:text-white">{client.progress}%</span>
          </div>
          <div className="h-2 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className={clsx("h-full transition-all duration-500 rounded-full", progressColor)}
              style={{ width: `${client.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
        <Link 
          href={`/clients/profile?id=${client.id}`}
          className="flex-1 text-center py-2 px-3 text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl hover:bg-primary-500 hover:text-white dark:hover:bg-primary-600 transition-all"
        >
          View Profile
        </Link>
        <button className="flex-1 text-center py-2 px-3 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all border border-transparent hover:border-primary-100 dark:hover:border-primary-900/50">
          Quick Schedule
        </button>
      </div>
    </div>
  );
}
