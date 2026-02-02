"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, User, Calendar, TrendingUp, Phone, Edit, Trash2, Archive, Target } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { useEventModal } from "@/context/EventModalContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";

export interface Client {
  id: string;
  name: string;
  age?: number;
  progress: number;
  medicalInfo?: string;
  parentName?: string;
  parentEmail?: string;
  phone?: string;
  birthDate?: string | null;
  assignedTherapistId?: string;
  createdAt?: string;
  isArchived?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
}

export interface Event {
  id: string;
  clientId: string;
  startTime: string;
}

export interface InterventionPlan {
  id: string;
  name: string;
  status: string;
}

interface ClientCardProps {
  client: Client;
  teamMembers: TeamMember[];
  events: Event[];
  activePlan: InterventionPlan | null;
}

// Helper to calculate age from birthDate
function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default function ClientCard({ client, teamMembers, events, activePlan }: ClientCardProps) {
  const { openModal } = useEventModal();
  const { success, error } = useToast();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const therapist = teamMembers.find(t => t.id === client.assignedTherapistId);
  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const age = client.age ?? calculateAge(client.birthDate);

  // Progress color logic
  const progressColor = client.progress >= 80 ? 'bg-success-500' : client.progress >= 60 ? 'bg-warning-500' : 'bg-error-500';

  // Find next upcoming event for this client
  const now = new Date();
  const nextEvent = events
    .filter(e => e.clientId === client.id && new Date(e.startTime) > now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];

  // Format next event display
  const formatNextEvent = () => {
    if (!nextEvent) return null;
    const eventDate = new Date(nextEvent.startTime);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isToday = eventDate.toDateString() === today.toDateString();
    const isTomorrow = eventDate.toDateString() === tomorrow.toDateString();

    const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isTomorrow) return `Tomorrow, ${timeStr}`;
    return eventDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + `, ${timeStr}`;
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle Quick Schedule
  const handleQuickSchedule = () => {
    openModal({ clientId: client.id });
  };

  // Handle Archive
  const handleArchive = async () => {
    try {
      await updateDoc(doc(db, "clients", client.id), {
        isArchived: !client.isArchived
      });
      success(client.isArchived ? "Client restored" : "Client archived");
      setIsMenuOpen(false);
    } catch (err) {
      error("Failed to update client");
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${client.name}? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteDoc(doc(db, "clients", client.id));
      success("Client deleted");
    } catch (err) {
      error("Failed to delete client");
    }
  };

  return (
    <div className={clsx(
      "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md transition-all group flex flex-col h-full",
      client.isArchived && "opacity-60"
    )}>
      {/* Top Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={clsx(
            "w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg border-2 border-white dark:border-neutral-800 shadow-sm",
            client.isArchived
              ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
              : "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
          )}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-neutral-900 dark:text-white leading-tight">{client.name}</h3>
              {client.isArchived && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded">
                  Archived
                </span>
              )}
              {activePlan && !client.isArchived && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded flex items-center gap-0.5" title={`Active Plan: ${activePlan.name}`}>
                  <Target className="w-2.5 h-2.5" />
                  Plan
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-500">
              {age !== null ? `Age: ${age} years` : "Age: N/A"}
              {client.birthDate && ` • Born: ${new Date(client.birthDate).toLocaleDateString('ro-RO', { day: '2-digit', month: 'short', year: 'numeric' })}`}
            </p>
          </div>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {/* Dropdown Menu */}
          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <Link
                href={`/clients/profile?id=${client.id}&edit=true`}
                className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={handleArchive}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <Archive className="w-4 h-4" />
                {client.isArchived ? "Restore" : "Archive"}
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
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

        {/* Phone Number */}
        {client.phone && (
          <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
            <Phone className="w-4 h-4 text-neutral-400" />
            <a
              href={`tel:${client.phone}`}
              className="font-medium hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {client.phone}
            </a>
          </div>
        )}

        {/* Next Session */}
        <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
          <Calendar className="w-4 h-4 text-neutral-400" />
          {nextEvent ? (
            <span className="truncate">
              Next: <span className="font-medium text-neutral-900 dark:text-white">{formatNextEvent()}</span>
            </span>
          ) : (
            <span className="truncate italic text-neutral-400">No upcoming sessions</span>
          )}
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
        <button
          onClick={handleQuickSchedule}
          className="flex-1 text-center py-2 px-3 text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all border border-transparent hover:border-primary-100 dark:hover:border-primary-900/50"
        >
          Quick Schedule
        </button>
      </div>
    </div>
  );
}
