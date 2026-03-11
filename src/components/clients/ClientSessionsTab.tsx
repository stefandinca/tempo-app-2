"use client";

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useClientEvents, useTeamMembers } from "@/hooks/useCollections";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText, BookOpen, Mic, Video, Calendar } from "lucide-react";
import { clsx } from "clsx";
import i18n from "@/lib/i18n";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";

interface ClientSessionsTabProps {
  client: any;
}

export default function ClientSessionsTab({ client }: ClientSessionsTabProps) {
  const { t } = useTranslation();
  const { data: events, loading } = useClientEvents(client.id);
  const { data: teamMembers } = useTeamMembers();

  const [voiceFeedbackEventIds, setVoiceFeedbackEventIds] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Real-time listener for voice feedback presence
  useEffect(() => {
    if (!client.id) return;

    const unsubscribe = onSnapshot(
      collection(db, "clients", client.id, "voiceFeedback"),
      (snapshot) => {
        const ids = new Set<string>();
        snapshot.forEach((doc) => {
          const data = doc.data();
          if (data.eventId) ids.add(data.eventId);
        });
        setVoiceFeedbackEventIds(ids);
      },
      (err) => console.error("Error fetching voice feedback:", err)
    );

    return () => unsubscribe();
  }, [client.id]);

  // Group events by month
  const groupedEvents = useMemo(() => {
    if (!events.length) return [];

    const locale = i18n.language || "ro";
    const groups: { key: string; label: string; count: number; events: any[] }[] = [];
    const map = new Map<string, any[]>();

    for (const event of events) {
      const date = event.startTime?.toDate ? event.startTime.toDate() : new Date(event.startTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }

    for (const [key, evts] of Array.from(map.entries())) {
      const [y, m] = key.split("-").map(Number);
      const d = new Date(y, m - 1, 1);
      const label = d.toLocaleDateString(locale, { month: "long", year: "numeric" });
      groups.push({ key, label, count: evts.length, events: evts });
    }

    return groups;
  }, [events]);

  const handleCardClick = (event: any) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        {[1, 2].map((g) => (
          <div key={g} className="space-y-3">
            <div className="h-5 w-40 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  // Empty state
  if (!events.length) {
    return (
      <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <Calendar className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
          {t("clients.sessions_tab.empty")}
        </h3>
        <p className="text-neutral-500 mt-1 text-sm">
          {t("clients.sessions_tab.empty_subtitle")}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-8">
        {groupedEvents.map((group) => (
          <div key={group.key}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider capitalize">
                {group.label}
              </h3>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                {t("clients.sessions_tab.session_count", { count: group.count })}
              </span>
            </div>
            <div className="space-y-2">
              {group.events.map((event) => (
                <SessionCard
                  key={event.id}
                  event={event}
                  teamMembers={teamMembers}
                  voiceFeedbackEventIds={voiceFeedbackEventIds}
                  onClick={() => handleCardClick(event)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </>
  );
}

function SessionCard({
  event,
  teamMembers,
  voiceFeedbackEventIds,
  onClick,
}: {
  event: any;
  teamMembers: any[];
  voiceFeedbackEventIds: Set<string>;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const locale = i18n.language || "ro";

  const date = event.startTime?.toDate ? event.startTime.toDate() : new Date(event.startTime);
  const day = date.getDate();
  const shortMonth = date.toLocaleDateString(locale, { month: "short" });
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const therapist = teamMembers.find((tm) => tm.id === event.therapistId);
  const therapistName = therapist?.name || t("common.unknown");
  const serviceLabel = event.type || "";

  const hasNotes = !!(event.details && event.details.trim());
  const hasPrograms = !!(event.programIds?.length || (event.programNotes && Object.keys(event.programNotes).length));
  const hasVoice = voiceFeedbackEventIds.has(event.id);

  const borderColor =
    event.attendance === "present"
      ? "border-l-success-500"
      : event.attendance === "absent"
        ? "border-l-error-500"
        : event.attendance === "excused"
          ? "border-l-warning-500"
          : "border-l-neutral-300 dark:border-l-neutral-600";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full flex items-center gap-3 p-3 min-h-[44px] rounded-xl border border-neutral-200 dark:border-neutral-800 border-l-4 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800/80 transition-colors text-left",
        borderColor
      )}
    >
      {/* Date block */}
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-neutral-900 dark:text-white leading-none">{day}</span>
        <span className="text-[10px] text-neutral-500 uppercase leading-none mt-0.5">{shortMonth}</span>
      </div>

      {/* Center content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{serviceLabel}</p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
          {therapistName} · {time}
        </p>
      </div>

      {/* Indicator icons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {hasNotes && (
          <FileText
            className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500"
            aria-label={t("clients.sessions_tab.has_notes")}
          />
        )}
        {hasPrograms && (
          <BookOpen
            className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500"
            aria-label={t("clients.sessions_tab.has_programs")}
          />
        )}
        {hasVoice && (
          <Mic
            className="w-3.5 h-3.5 text-primary-400 dark:text-primary-500"
            aria-label={t("clients.sessions_tab.has_voice_notes")}
          />
        )}
        {false && (
          <Video
            className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500"
            aria-label={t("clients.sessions_tab.has_video")}
          />
        )}
      </div>
    </button>
  );
}
