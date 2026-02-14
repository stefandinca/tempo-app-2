"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, User, Calendar, Phone, Edit, Trash2, Archive, Target } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { useEventModal } from "@/context/EventModalContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";
import { useData } from "@/context/DataContext";

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
  therapistIds?: string[];
  createdAt?: string;
  isArchived?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  color: string;
  photoURL?: string;
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
  const { t, i18n } = useTranslation();
  const { openModal } = useEventModal();
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { clients: clientsData, systemSettings } = useData();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Get all assigned therapists (support both old and new field)
  const assignedIds = client.therapistIds && client.therapistIds.length > 0
    ? client.therapistIds
    : client.assignedTherapistId
    ? [client.assignedTherapistId]
    : [];
  const assignedTherapists = teamMembers.filter(t => assignedIds.includes(t.id));

  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const age = client.age ?? calculateAge(client.birthDate);

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

    const timeStr = eventDate.toLocaleTimeString(i18n.language === 'ro' ? 'ro-RO' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: i18n.language !== 'ro' });

    if (isToday) return `${t('calendar.today')}, ${timeStr}`;
    if (isTomorrow) return `${i18n.language === 'ro' ? 'Mâine' : 'Tomorrow'}, ${timeStr}`;
    return eventDate.toLocaleDateString(i18n.language === 'ro' ? 'ro-RO' : 'en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + `, ${timeStr}`;
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
    // If we are restoring (isArchived is true, so it will become false)
    if (client.isArchived) {
      const maxClients = systemSettings?.maxActiveClients || 0;
      if (maxClients > 0) {
        const activeCount = clientsData.data.filter((c: any) => !c.isArchived).length;
        if (activeCount >= maxClients) {
          customConfirm({
            title: t('limits.client_limit_reached_title'),
            message: t('limits.client_limit_reached_message', { max: maxClients }),
            confirmLabel: 'OK',
            variant: 'warning',
            onConfirm: () => {},
          });
          setIsMenuOpen(false);
          return;
        }
      }
    }

    try {
      await updateDoc(doc(db, "clients", client.id), {
        isArchived: !client.isArchived
      });
      success(client.isArchived ? t('clients.client_restored') : t('clients.client_archived'));
      setIsMenuOpen(false);
    } catch (err) {
      error(t('clients.update_error'));
    }
  };

  // Handle Delete
  const handleDelete = async () => {
    customConfirm({
      title: t('common.delete'),
      message: t('clients.delete_confirm', { name: client.name }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "clients", client.id));
          success(t('clients.client_deleted'));
        } catch (err) {
          error(t('clients.delete_error'));
        }
      }
    });
  };

  return (
    <div className={clsx(
      "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 md:p-5 hover:shadow-md transition-all group flex flex-col h-full",
      client.isArchived && "opacity-60"
    )}>
      {/* Header & Main Info */}
      <div className="flex gap-4 mb-4">
        {/* Left: Avatar (Static size on mobile, responsive on desktop) */}
        <div className={clsx(
          "w-14 h-14 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-xl md:text-lg border-2 border-white dark:border-neutral-800 shadow-sm shrink-0",
          client.isArchived
            ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400"
            : "bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
        )}>
          {initials}
        </div>

        {/* Right: Name & Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/clients/profile?id=${client.id}`} className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors truncate block">
                  <h3 className="font-bold text-neutral-900 dark:text-white leading-tight truncate">{client.name}</h3>
                </Link>
                {client.isArchived && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400 rounded">
                    {t('clients.status.archived')}
                  </span>
                )}
              </div>
              <p className="text-[11px] md:text-xs text-neutral-500 mt-0.5">
                {age !== null ? t('clients.age_years', { count: age }) : "Age: N/A"}
                <span className="hidden sm:inline"> • {client.birthDate && `${t('clients.born')}: ${new Date(client.birthDate).toLocaleDateString(i18n.language === 'ro' ? 'ro-RO' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' })}`}</span>
              </p>
            </div>
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 -mr-1 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Link
                    href={`/clients/profile?id=${client.id}&edit=true`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Edit className="w-4 h-4" />
                    {t('common.edit')}
                  </Link>
                  <button
                    onClick={handleArchive}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    {client.isArchived ? t('clients.restore') : t('clients.archive')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {/* Therapist(s) */}
            <div className="flex items-center gap-2 text-[11px] md:text-sm text-neutral-600 dark:text-neutral-400">
              <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              {assignedTherapists.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {assignedTherapists.map((therapist) => (
                    <div
                      key={therapist.id}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs text-white font-bold shrink-0 overflow-hidden border-2 border-white dark:border-neutral-800 shadow-sm"
                      style={{ backgroundColor: therapist.photoURL ? 'transparent' : therapist.color }}
                      title={therapist.name}
                    >
                      {therapist.photoURL ? (
                        <img src={therapist.photoURL} alt={therapist.name} className="w-full h-full object-cover" />
                      ) : (
                        therapist.initials
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <span className="italic text-neutral-400">{t('clients.unassigned')}</span>
              )}
            </div>

            {/* Next Session */}
            <div className="flex items-start gap-2 text-[11px] md:text-sm text-neutral-600 dark:text-neutral-400">
              <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0 mt-0.5" />
              <span className="break-words">
                {nextEvent ? formatNextEvent() : t('clients.no_upcoming')}
              </span>
            </div>
          </div>
        </div>
      </div>


      {/* Footer Actions */}
      <div className="mt-5 md:mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 md:gap-3">
        <Link 
          href={`/clients/profile?id=${client.id}`}
          className="flex-1 text-center py-2 px-2 md:px-3 text-xs md:text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl hover:bg-primary-500 hover:text-white transition-all"
        >
          {t('clients.view_profile')}
        </Link>
        <button
          onClick={handleQuickSchedule}
          className="flex-1 text-center py-2 px-2 md:px-3 text-xs md:text-sm font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all border border-transparent"
        >
          {t('clients.quick_schedule')}
        </button>
      </div>
    </div>
  );
}

