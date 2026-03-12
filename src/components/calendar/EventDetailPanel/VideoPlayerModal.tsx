"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

interface VideoPlayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  videoName: string;
}

export default function VideoPlayerModal({
  isOpen,
  onClose,
  videoUrl,
  videoName,
}: VideoPlayerModalProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 min-w-11 min-h-11 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
        aria-label={t("calendar.event.videos.close_player")}
      >
        <X className="w-5 h-5" />
      </button>

      {/* Video name */}
      <div className="absolute top-4 left-4 z-10">
        <p className="text-white text-sm font-medium drop-shadow-lg">
          {videoName}
        </p>
      </div>

      {/* Video player */}
      <div className="w-full max-w-3xl mx-4">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          autoPlay
          playsInline
          className="w-full max-h-[80vh] rounded-xl bg-black"
        />
      </div>
    </div>
  );
}
