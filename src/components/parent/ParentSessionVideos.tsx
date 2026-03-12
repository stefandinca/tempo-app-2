"use client";

import { useState, useEffect } from "react";
import { Video, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import type { SessionVideo } from "@/hooks/useSessionVideos";
import VideoPlayerModal from "../calendar/EventDetailPanel/VideoPlayerModal";

interface ParentSessionVideosProps {
  clientId: string;
  eventId: string;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function ParentSessionVideos({
  clientId,
  eventId,
}: ParentSessionVideosProps) {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const [videos, setVideos] = useState<SessionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingVideo, setPlayingVideo] = useState<SessionVideo | null>(null);

  useEffect(() => {
    if (!clientId || !eventId) {
      setVideos([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", clientId, "videos"),
      where("eventId", "==", eventId),
      where("sharedWithParent", "==", true)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: SessionVideo[] = [];
        snapshot.forEach((docSnap) => {
          items.push({ id: docSnap.id, ...docSnap.data() } as SessionVideo);
        });
        // Sort newest first client-side
        items.sort((a, b) => {
          const aTime = a.recordedAt?.toMillis?.() || 0;
          const bTime = b.recordedAt?.toMillis?.() || 0;
          return bTime - aTime;
        });
        setVideos(items);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching parent session videos:", err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, eventId]);

  // Hide section entirely if no shared videos
  if (loading || videos.length === 0) return null;

  return (
    <div className="py-1">
      <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
        {t("parent_portal.session_detail.videos.title")}
      </p>

      <div className="space-y-2">
        {videos.map((item) => {
          const recordedDate = item.recordedAt?.toDate
            ? item.recordedAt.toDate().toLocaleDateString(currentLang, {
                month: "short",
                day: "numeric",
              })
            : "";

          return (
            <button
              key={item.id}
              onClick={() => setPlayingVideo(item)}
              className="w-full bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Thumbnail */}
                <div className="relative w-16 h-12 rounded-lg bg-neutral-200 dark:bg-neutral-700 overflow-hidden flex-shrink-0">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video className="w-5 h-5 text-neutral-400" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play className="w-5 h-5 text-white fill-white" />
                  </div>
                </div>

                {/* Info */}
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
                          {t("parent_portal.session_detail.videos.recorded_on", {
                            date: recordedDate,
                          })}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Video Player Modal */}
      {playingVideo && (
        <VideoPlayerModal
          isOpen={!!playingVideo}
          onClose={() => setPlayingVideo(null)}
          videoUrl={playingVideo.downloadUrl}
          videoName={playingVideo.name}
        />
      )}
    </div>
  );
}
