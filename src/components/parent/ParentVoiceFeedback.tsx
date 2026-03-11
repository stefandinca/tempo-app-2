"use client";

import { useState, useEffect, useRef } from "react";
import { Mic } from "lucide-react";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import type { VoiceFeedback } from "@/hooks/useVoiceFeedback";

interface ParentVoiceFeedbackProps {
  clientId: string;
  eventId: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ParentVoiceFeedback({
  clientId,
  eventId,
}: ParentVoiceFeedbackProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const [feedback, setFeedback] = useState<VoiceFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!clientId || !eventId) {
      setFeedback([]);
      setLoading(false);
      return;
    }

    // No orderBy to avoid needing a composite index — sort client-side instead
    const q = query(
      collection(db, "clients", clientId, "voiceFeedback"),
      where("eventId", "==", eventId),
      where("sharedWithParent", "==", true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: VoiceFeedback[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as VoiceFeedback);
        });
        // Sort newest first client-side
        items.sort((a, b) => {
          const aTime = a.recordedAt?.toMillis?.() || 0;
          const bTime = b.recordedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setFeedback(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching parent voice feedback:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, eventId]);

  const handlePlay = (audioEl: HTMLAudioElement) => {
    if (currentAudioRef.current && currentAudioRef.current !== audioEl) {
      currentAudioRef.current.pause();
    }
    currentAudioRef.current = audioEl;
  };

  // Hide section entirely if no shared feedback
  if (loading || feedback.length === 0) return null;

  return (
    <div className="py-1">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
        {t("parent_portal.session_detail.voice_feedback.title")}
      </p>

      <div className="space-y-2">
        {feedback.map((item) => {
          const recordedDate = item.recordedAt?.toDate
            ? item.recordedAt.toDate().toLocaleDateString(currentLang, {
                month: "short",
                day: "numeric",
              })
            : "";

          return (
            <div
              key={item.id}
              className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                  <Mic className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-neutral-400">
                    <span>{formatDuration(item.duration)}</span>
                    {recordedDate && (
                      <>
                        <span>&middot;</span>
                        <span>
                          {t("parent_portal.session_detail.voice_feedback.recorded_on", {
                            date: recordedDate,
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <audio
                src={item.downloadUrl}
                controls
                className="w-full h-8"
                onPlay={(e) => handlePlay(e.currentTarget)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
