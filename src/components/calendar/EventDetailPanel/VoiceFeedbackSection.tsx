"use client";

import { useState, useRef } from "react";
import { Mic, MoreVertical, Play, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { useVoiceFeedback, VoiceFeedback } from "@/hooks/useVoiceFeedback";
import { formatFileSize } from "@/hooks/useClientDocuments";
import AudioRecordingModal from "./AudioRecordingModal";

interface VoiceFeedbackSectionProps {
  eventId: string;
  clientId: string;
  clientName?: string;
  canEdit: boolean;
}

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function VoiceFeedbackSection({
  eventId,
  clientId,
  clientName,
  canEdit,
}: VoiceFeedbackSectionProps) {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const toast = useToast();
  const {
    feedback,
    loading,
    uploadFeedback,
    deleteFeedback,
    toggleParentAccess,
    canUploadMore,
  } = useVoiceFeedback(clientId, eventId);

  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [uploadingItems, setUploadingItems] = useState<
    { name: string; progress: number }[]
  >([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleUpload = async (blob: Blob, name: string, shared: boolean) => {
    if (!user) return;

    const ext = blob.type.includes("mp4") ? "mp4" : "webm";
    const file = new File([blob], `${name.replace(/[^a-zA-Z0-9 ]/g, "_")}.${ext}`, {
      type: blob.type,
    });

    const uploadIndex = uploadingItems.length;
    setUploadingItems((prev) => [...prev, { name, progress: 0 }]);

    try {
      await uploadFeedback(
        file,
        {
          name,
          duration: 0, // Duration is tracked by the recorder, passed via blob metadata
          sharedWithParent: shared,
          uploadedBy: user.uid,
          uploadedByName: userData?.name || user.email || "Unknown",
          clientName,
        },
        (progress) => {
          setUploadingItems((prev) =>
            prev.map((item, i) =>
              i === uploadIndex ? { ...item, progress } : item
            )
          );
        }
      );
      toast.success(t("calendar.event.voice_feedback.upload_success"));
    } catch (err: any) {
      toast.error(
        err.message || t("calendar.event.voice_feedback.upload_error")
      );
    } finally {
      setUploadingItems((prev) => prev.filter((_, i) => i !== uploadIndex));
    }
  };

  const handleDelete = async (item: VoiceFeedback) => {
    if (!user) return;
    setDeletingId(item.id);
    setOpenMenuId(null);

    try {
      await deleteFeedback(
        item,
        user.uid,
        userData?.name || user.email || "Unknown",
        clientName
      );
      toast.success(t("calendar.event.voice_feedback.delete_success"));
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleShare = async (item: VoiceFeedback) => {
    if (!user) return;
    setOpenMenuId(null);

    try {
      await toggleParentAccess(
        item.id,
        !item.sharedWithParent,
        user.uid,
        userData?.name || user.email || "Unknown",
        clientName,
        item.name
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handlePlay = (audioEl: HTMLAudioElement) => {
    // Pause any currently playing audio to avoid overlap
    if (currentAudioRef.current && currentAudioRef.current !== audioEl) {
      currentAudioRef.current.pause();
    }
    currentAudioRef.current = audioEl;
  };

  if (loading) {
    return (
      <div className="py-3">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
          {t("calendar.event.voice_feedback.title")}
        </p>
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="py-1">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {t("calendar.event.voice_feedback.title")}
        </p>
        {canEdit && canUploadMore && (
          <button
            onClick={() => setIsRecordingModalOpen(true)}
            className="min-h-9 flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            <Mic className="w-3.5 h-3.5" />
            {t("calendar.event.voice_feedback.record")}
          </button>
        )}
      </div>

      {/* Feedback list */}
      {feedback.length === 0 && uploadingItems.length === 0 && (
        <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
          <Mic className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-400">
            {t("calendar.event.voice_feedback.no_feedback")}
          </p>
          <p className="text-xs text-neutral-300 dark:text-neutral-600 mt-0.5">
            {t("calendar.event.voice_feedback.no_feedback_hint")}
          </p>
        </div>
      )}

      {feedback.length > 0 && (
        <div className="space-y-2">
          {feedback.map((item) => (
            <div
              key={item.id}
              className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                    <Mic className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>{formatDuration(item.duration)}</span>
                      <span>&middot;</span>
                      <span>{formatFileSize(item.fileSize)}</span>
                      <span>&middot;</span>
                      <span
                        className={clsx(
                          "inline-flex items-center gap-0.5",
                          item.sharedWithParent
                            ? "text-success-600 dark:text-success-400"
                            : "text-neutral-400"
                        )}
                      >
                        {item.sharedWithParent ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {item.sharedWithParent
                          ? t("calendar.event.voice_feedback.shared_badge")
                          : t("calendar.event.voice_feedback.hidden_badge")}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Context menu */}
                {canEdit && (
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={() =>
                        setOpenMenuId(openMenuId === item.id ? null : item.id)
                      }
                      className="min-w-9 min-h-9 flex items-center justify-center rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-neutral-500" />
                    </button>

                    {openMenuId === item.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-neutral-800 rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700 py-1 min-w-[180px] z-20">
                          <button
                            onClick={() => handleToggleShare(item)}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                          >
                            {item.sharedWithParent ? (
                              <>
                                <EyeOff className="w-4 h-4" />
                                {t("calendar.event.voice_feedback.hide_from_parent")}
                              </>
                            ) : (
                              <>
                                <Eye className="w-4 h-4" />
                                {t("calendar.event.voice_feedback.share_with_parent")}
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            disabled={deletingId === item.id}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
                          >
                            {deletingId === item.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            {t("common.delete") || "Delete"}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Inline audio player */}
              <audio
                src={item.downloadUrl}
                controls
                className="w-full h-8"
                onPlay={(e) => handlePlay(e.currentTarget)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Upload progress */}
      {uploadingItems.map((item, i) => (
        <div
          key={`uploading-${i}`}
          className="mt-2 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
            <span className="text-xs text-neutral-500">
              {t("calendar.event.voice_feedback.upload_progress", {
                progress: Math.round(item.progress),
              })}
            </span>
          </div>
          <div className="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-1.5">
            <div
              className="bg-primary-500 h-1.5 rounded-full transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      ))}

      {/* Recording Modal */}
      <AudioRecordingModal
        isOpen={isRecordingModalOpen}
        onClose={() => setIsRecordingModalOpen(false)}
        onUpload={handleUpload}
        clipNumber={feedback.length + 1}
      />
    </div>
  );
}
