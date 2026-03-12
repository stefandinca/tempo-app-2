"use client";

import { useState, useRef, useCallback, useEffect } from "react";

/** Detect the best supported MIME type for video recording */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

export function useMediaRecorder() {
  const [isSupported, setIsSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveStopRef = useRef<((blob: Blob) => void) | null>(null);
  const facingModeRef = useRef<"user" | "environment">("environment");
  const mimeTypeRef = useRef<string>("");
  const streamRef = useRef<MediaStream | null>(null);

  // Check browser support on mount
  useEffect(() => {
    const supported =
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== "undefined" &&
      getSupportedMimeType() !== "";
    setIsSupported(supported);
    if (supported) {
      mimeTypeRef.current = getSupportedMimeType();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Keep ref in sync
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  const startTimer = useCallback(() => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const getStream = useCallback(async (facingMode: "user" | "environment") => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      return mediaStream;
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Camera permission denied. Please allow camera access.");
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("No camera found. Please connect a camera.");
      }
      throw new Error("Could not access camera. Please check permissions.");
    }
  }, []);

  /** Start camera preview without recording */
  const startPreview = useCallback(
    async (facingMode: "user" | "environment" = "environment") => {
      setError(null);
      facingModeRef.current = facingMode;

      try {
        // Stop existing stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }
        const mediaStream = await getStream(facingMode);
        setStream(mediaStream);
      } catch (err: any) {
        setError(err.message || "Could not access camera.");
      }
    },
    [getStream]
  );

  /** Start recording using existing preview stream or create new one */
  const startRecording = useCallback(
    async (facingMode: "user" | "environment" = "environment") => {
      setError(null);
      facingModeRef.current = facingMode;

      try {
        let mediaStream = streamRef.current;

        // If no stream or stream tracks are ended, get a new one
        if (!mediaStream || mediaStream.getTracks().some((t) => t.readyState === "ended")) {
          mediaStream = await getStream(facingMode);
          setStream(mediaStream);
        }

        chunksRef.current = [];

        const mimeType = mimeTypeRef.current;
        const recorder = new MediaRecorder(mediaStream, {
          mimeType,
          videoBitsPerSecond: 2_500_000,
        });

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          if (resolveStopRef.current) {
            resolveStopRef.current(blob);
            resolveStopRef.current = null;
          }
        };

        recorder.onerror = () => {
          setError("Recording failed. Please try again.");
          setIsRecording(false);
          stopTimer();
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000);
        setIsRecording(true);
        setIsPaused(false);
        startTimer();
      } catch (err: any) {
        setError(err.message || "Could not access camera.");
      }
    },
    [getStream, startTimer, stopTimer]
  );

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        reject(new Error("No active recording"));
        return;
      }

      resolveStopRef.current = resolve;
      stopTimer();
      setIsRecording(false);
      setIsPaused(false);
      recorder.stop();

      // Stop the camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    });
  }, [stopTimer]);

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setIsPaused(true);
      stopTimer();
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      setIsPaused(false);
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    }
  }, []);

  const flipCamera = useCallback(async () => {
    const newFacing = facingModeRef.current === "user" ? "environment" : "user";
    facingModeRef.current = newFacing;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }

    try {
      const newStream = await getStream(newFacing);
      setStream(newStream);
    } catch (err: any) {
      setError(err.message || "Could not flip camera.");
    }
  }, [getStream]);

  const cleanup = useCallback(() => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Already stopped
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      setStream(null);
    }
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setError(null);
    chunksRef.current = [];
    mediaRecorderRef.current = null;
    resolveStopRef.current = null;
  }, [stopTimer]);

  return {
    isSupported,
    isRecording,
    isPaused,
    duration,
    stream,
    error,
    startPreview,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    flipCamera,
    cleanup,
  };
}
