"use client";

import { useState, useRef, useEffect } from "react";
import { X, Mic, Square, Pause, Play } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";

interface AudioRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (blob: Blob, name: string, shared: boolean) => void;
  clipNumber: number;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type ModalState = "ready" | "recording" | "preview";

export default function AudioRecordingModal({
  isOpen,
  onClose,
  onUpload,
  clipNumber,
}: AudioRecordingModalProps) {
  const { t } = useTranslation();
  const {
    isSupported,
    isRecording,
    isPaused,
    duration,
    error: recorderError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cleanup,
  } = useAudioRecorder();

  const [state, setState] = useState<ModalState>("ready");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);
  const [name, setName] = useState("");
  const [sharedWithParent, setSharedWithParent] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState("ready");
      setRecordedBlob(null);
      setRecordedDuration(0);
      setName(`${t("calendar.event.voice_feedback.feedback_name_placeholder")} ${clipNumber}`);
      setSharedWithParent(true);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    } else {
      cleanup();
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    }
  }, [isOpen, clipNumber, cleanup, t]);

  // Auto-transition to preview when recorder auto-stops at limit
  useEffect(() => {
    if (state === "recording" && !isRecording && !isPaused && duration > 0) {
      // Recorder auto-stopped (3 min limit)
      handleStopRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  if (!isOpen) return null;

  const handleStartRecording = async () => {
    await startRecording();
    setState("recording");
  };

  const handleStopRecording = async () => {
    try {
      const blob = await stopRecording();
      setRecordedBlob(blob);
      setRecordedDuration(duration);

      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
      }
      blobUrlRef.current = URL.createObjectURL(blob);
      setState("preview");
    } catch {
      // If stop fails (e.g., already stopped from auto-limit), stay in current state
    }
  };

  const handleDiscard = () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setRecordedBlob(null);
    setRecordedDuration(0);
    setState("ready");
  };

  const handleUpload = () => {
    if (!recordedBlob) return;
    onUpload(recordedBlob, name.trim() || `Voice note ${clipNumber}`, sharedWithParent);
    onClose();
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {state === "preview"
              ? t("calendar.event.voice_feedback.preview_title")
              : state === "recording"
              ? t("calendar.event.voice_feedback.recording")
              : t("calendar.event.voice_feedback.title")}
          </h3>
          <button
            onClick={handleClose}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {!isSupported && (
            <div className="text-center py-8">
              <Mic className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
              <p className="text-sm text-neutral-500">
                {t("calendar.event.voice_feedback.mic_not_supported")}
              </p>
            </div>
          )}

          {isSupported && recorderError && (
            <div className="text-center py-8">
              <Mic className="w-12 h-12 text-error-300 mx-auto mb-3" />
              <p className="text-sm text-error-600 dark:text-error-400">
                {recorderError}
              </p>
              <button
                onClick={() => setState("ready")}
                className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {t("common.try_again") || "Try again"}
              </button>
            </div>
          )}

          {isSupported && !recorderError && state === "ready" && (
            <div className="text-center py-8">
              <div className="w-20 h-20 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-4">
                <Mic className="w-10 h-10 text-primary-600 dark:text-primary-400" />
              </div>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                {t("calendar.event.voice_feedback.no_feedback_hint")}
              </p>
              <button
                onClick={handleStartRecording}
                className="min-h-11 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/20"
              >
                {t("calendar.event.voice_feedback.start_recording")}
              </button>
            </div>
          )}

          {isSupported && !recorderError && state === "recording" && (
            <div className="text-center py-6">
              {/* Waveform animation */}
              <div className="flex items-center justify-center gap-1 h-16 mb-4">
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "w-1.5 rounded-full transition-all",
                      isPaused
                        ? "bg-neutral-300 dark:bg-neutral-600 h-2"
                        : "bg-primary-500 dark:bg-primary-400 animate-pulse"
                    )}
                    style={
                      !isPaused
                        ? {
                            height: `${Math.random() * 48 + 8}px`,
                            animationDelay: `${i * 0.1}s`,
                            animationDuration: `${0.5 + Math.random() * 0.5}s`,
                          }
                        : undefined
                    }
                  />
                ))}
              </div>

              {/* Timer */}
              <p className="text-3xl font-mono font-bold text-neutral-900 dark:text-white mb-1">
                {formatDuration(duration)}
              </p>
              <p className="text-xs text-neutral-400 mb-6">
                {t("calendar.event.voice_feedback.duration_limit_warning")}
              </p>

              {/* Controls */}
              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="min-w-11 min-h-11 p-3 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  {isPaused ? (
                    <Play className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                  ) : (
                    <Pause className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                  )}
                </button>
                <button
                  onClick={handleStopRecording}
                  className="min-w-14 min-h-14 p-4 bg-error-500 hover:bg-error-600 rounded-full transition-colors shadow-lg"
                >
                  <Square className="w-6 h-6 text-white" fill="white" />
                </button>
              </div>
            </div>
          )}

          {isSupported && !recorderError && state === "preview" && (
            <div className="py-4">
              {/* Audio player */}
              <div className="mb-5">
                <audio
                  ref={audioRef}
                  src={blobUrlRef.current || undefined}
                  controls
                  className="w-full h-10"
                />
                <p className="text-xs text-neutral-400 mt-1 text-center">
                  {formatDuration(recordedDuration)}
                </p>
              </div>

              {/* Name field */}
              <div className="mb-4">
                <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-1">
                  {t("calendar.event.voice_feedback.feedback_name")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("calendar.event.voice_feedback.feedback_name_placeholder")}
                  className="w-full px-3 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 transition-all"
                />
              </div>

              {/* Share toggle */}
              <label className="flex items-center gap-3 cursor-pointer mb-6">
                <input
                  type="checkbox"
                  checked={sharedWithParent}
                  onChange={(e) => setSharedWithParent(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  {t("calendar.event.voice_feedback.share_with_parent")}
                </span>
              </label>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDiscard}
                  className="flex-1 min-h-11 px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm font-medium hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {t("calendar.event.voice_feedback.discard")}
                </button>
                <button
                  onClick={handleUpload}
                  className="flex-1 min-h-11 px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold transition-colors shadow-lg shadow-primary-500/20"
                >
                  {t("calendar.event.voice_feedback.confirm_upload")}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
