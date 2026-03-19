"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, RefreshCw, Circle, Square, Pause, Play } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useToast } from "@/context/ToastContext";

interface VideoRecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (blob: Blob, name: string, shared: boolean) => void;
  clipNumber: number;
}

const MAX_DURATION = 300; // 5 minutes in seconds

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type ModalState = "preview" | "recording" | "review";

export default function VideoRecordingModal({
  isOpen,
  onClose,
  onUpload,
  clipNumber,
}: VideoRecordingModalProps) {
  const { t } = useTranslation();
  const toast = useToast();
  const {
    isSupported,
    isRecording,
    isPaused,
    duration,
    stream,
    error: recorderError,
    startPreview,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    flipCamera,
    cleanup,
  } = useMediaRecorder();

  const [state, setState] = useState<ModalState>("preview");
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [videoName, setVideoName] = useState("");
  const [shareWithParent, setShareWithParent] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);

  // Reset state when modal opens — start camera preview only
  useEffect(() => {
    if (isOpen) {
      setState("preview");
      setRecordedBlob(null);
      setVideoName(`${t("calendar.event.videos.video_name_placeholder")} ${clipNumber}`);
      setShareWithParent(true);
      setCameraReady(false);
      startPreview("environment");
    } else {
      cleanup();
      setCameraReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Attach stream to live video element
  useEffect(() => {
    if (liveVideoRef.current && stream) {
      liveVideoRef.current.srcObject = stream;
      setCameraReady(true);
    }
  }, [stream]);

  // Attach recorded blob to review video
  useEffect(() => {
    if (reviewVideoRef.current && recordedBlob) {
      reviewVideoRef.current.src = URL.createObjectURL(recordedBlob);
    }
  }, [recordedBlob]);

  // Auto-stop at max duration
  useEffect(() => {
    if (isRecording && !isPaused && duration >= MAX_DURATION) {
      handleStopRecording();
      toast.info(t("calendar.event.videos.duration_limit_warning"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, isRecording, isPaused]);

  // Close on Escape (not while recording)
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && state !== "recording") handleClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, state]);

  const handleStartRecording = useCallback(async () => {
    try {
      await startRecording("environment");
      setState("recording");
    } catch {
      // Error handled in hook
    }
  }, [startRecording]);

  const handleStopRecording = useCallback(async () => {
    try {
      const blob = await stopRecording();
      setRecordedBlob(blob);
      setState("review");
    } catch {
      setState("preview");
    }
  }, [stopRecording]);

  const handleDiscard = useCallback(() => {
    setRecordedBlob(null);
    setState("preview");
    startPreview("environment");
  }, [startPreview]);

  const handleUpload = useCallback(() => {
    if (!recordedBlob) return;
    onUpload(recordedBlob, videoName.trim() || `Session clip ${clipNumber}`, shareWithParent);
    onClose();
  }, [recordedBlob, videoName, clipNumber, shareWithParent, onUpload, onClose]);

  const handleClose = useCallback(() => {
    cleanup();
    onClose();
  }, [cleanup, onClose]);

  if (!isOpen) return null;

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full text-center">
          <p className="text-neutral-900 dark:text-white font-semibold mb-2">
            {t("calendar.event.videos.camera_not_supported")}
          </p>
          <button
            onClick={handleClose}
            className="mt-4 min-h-11 px-6 py-2.5 bg-primary-600 text-white rounded-xl font-semibold"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      {/* Top bar */}
      <div className="flex items-center justify-between p-4 z-10">
        <button
          onClick={handleClose}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-black/50 text-white"
          aria-label={t("common.close")}
        >
          <X className="w-5 h-5" />
        </button>

        {state === "recording" && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error-500 animate-pulse" />
            <span className="text-white font-mono text-sm font-semibold">
              {formatTimer(duration)}
            </span>
          </div>
        )}

        {state === "preview" && stream && (
          <button
            onClick={flipCamera}
            className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-black/50 text-white"
            aria-label={t("calendar.event.videos.flip_camera")}
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        )}

        {state === "review" && (
          <span className="text-white text-sm font-medium">
            {t("calendar.event.videos.preview_title")}
          </span>
        )}

        {/* Spacer for centering */}
        {(state === "recording" || state === "review") && <div className="w-11" />}
      </div>

      {/* Scrollable content area - enables scroll in review state on portrait mobile */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {/* Video area */}
        <div className={`${state !== "review" ? "flex-1" : ""} flex items-center justify-center px-4`}>
          {/* Camera preview / Recording */}
          {(state === "preview" || state === "recording") && (
            <div className="relative w-full max-w-lg aspect-[9/16] sm:aspect-video bg-black rounded-2xl overflow-hidden">
              <video
                ref={liveVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {recorderError && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
                  <p className="text-white text-sm text-center">{recorderError}</p>
                </div>
              )}
              {!cameraReady && !recorderError && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Review recorded video */}
          {state === "review" && recordedBlob && (
            <div className="w-full max-w-lg">
              <div className="aspect-[9/16] sm:aspect-video max-h-[55vh] sm:max-h-none bg-black rounded-2xl overflow-hidden">
                <video
                  ref={reviewVideoRef}
                  controls
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
          )}
        </div>

        {/* Bottom controls */}
        <div className="p-4 pb-8 shrink-0">
        {/* Preview state - Start button */}
        {state === "preview" && (
          <div className="flex justify-center">
            <button
              onClick={handleStartRecording}
              disabled={!cameraReady}
              className="min-w-16 min-h-16 w-16 h-16 rounded-full bg-error-500 hover:bg-error-600 disabled:bg-neutral-600 flex items-center justify-center transition-colors ring-4 ring-white/30"
              aria-label={t("calendar.event.videos.start_recording")}
            >
              <Circle className="w-7 h-7 text-white fill-white" />
            </button>
          </div>
        )}

        {/* Recording state - Pause & Stop */}
        {state === "recording" && (
          <div className="flex items-center justify-center gap-8">
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className="min-w-12 min-h-12 w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              aria-label={
                isPaused
                  ? t("calendar.event.videos.resume_recording")
                  : t("calendar.event.videos.pause_recording")
              }
            >
              {isPaused ? (
                <Play className="w-5 h-5 text-white fill-white" />
              ) : (
                <Pause className="w-5 h-5 text-white fill-white" />
              )}
            </button>
            <button
              onClick={handleStopRecording}
              className="min-w-16 min-h-16 w-16 h-16 rounded-full bg-error-500 hover:bg-error-600 flex items-center justify-center transition-colors ring-4 ring-white/30"
              aria-label={t("calendar.event.videos.stop_recording")}
            >
              <Square className="w-6 h-6 text-white fill-white" />
            </button>
          </div>
        )}

        {/* Review state - Name, share toggle, discard/upload */}
        {state === "review" && (
          <div className="max-w-lg mx-auto space-y-4">
            {/* Video name input */}
            <div>
              <label className="block text-xs text-neutral-400 mb-1">
                {t("calendar.event.videos.video_name")}
              </label>
              <input
                type="text"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                placeholder={t("calendar.event.videos.video_name_placeholder")}
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Share toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={shareWithParent}
                onChange={(e) => setShareWithParent(e.target.checked)}
                className="w-5 h-5 rounded border-neutral-600 text-primary-600 focus:ring-primary-500 bg-neutral-800"
              />
              <span className="text-sm text-white">
                {t("calendar.event.videos.share_with_parent")}
              </span>
            </label>

            {/* Action buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDiscard}
                className="flex-1 min-h-11 py-2.5 border border-neutral-600 text-neutral-300 rounded-xl font-semibold text-sm hover:bg-neutral-800 transition-colors"
              >
                {t("calendar.event.videos.discard")}
              </button>
              <button
                onClick={handleUpload}
                className="flex-1 min-h-11 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-semibold text-sm transition-colors"
              >
                {t("calendar.event.videos.confirm_upload")}
              </button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
