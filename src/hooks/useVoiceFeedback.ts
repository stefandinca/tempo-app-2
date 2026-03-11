"use client";

import { useState, useEffect, useMemo } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { logActivity } from "@/lib/activityService";
import { notifyParentVoiceFeedbackShared } from "@/lib/notificationService";

export interface VoiceFeedback {
  id: string;
  eventId: string;
  clientId: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  duration: number;
  storagePath: string;
  downloadUrl: string;
  recordedAt: any;
  uploadedAt: any;
  uploadedBy: string;
  uploadedByName: string;
  sharedWithParent: boolean;
}

export interface VoiceFeedbackUploadMetadata {
  name: string;
  duration: number;
  sharedWithParent: boolean;
  uploadedBy: string;
  uploadedByName: string;
  clientName?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_COUNT = 10;

export function useVoiceFeedback(clientId: string | null, eventId: string | null) {
  const [feedback, setFeedback] = useState<VoiceFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !eventId) {
      setFeedback([]);
      setLoading(false);
      return;
    }

    // No orderBy to avoid needing a composite index — sort client-side instead
    const q = query(
      collection(db, "clients", clientId, "voiceFeedback"),
      where("eventId", "==", eventId)
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
        console.error("Error fetching voice feedback:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, eventId]);

  const totalSize = useMemo(
    () => feedback.reduce((sum, f) => sum + (f.fileSize || 0), 0),
    [feedback]
  );

  const canUploadMore = feedback.length < MAX_COUNT && totalSize < MAX_TOTAL_SIZE;

  const uploadFeedback = async (
    file: File,
    metadata: VoiceFeedbackUploadMetadata,
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    if (!clientId || !eventId) return null;

    if (file.size > MAX_FILE_SIZE) {
      throw new Error("Audio must be under 10MB");
    }
    if (totalSize + file.size > MAX_TOTAL_SIZE) {
      throw new Error("Total voice feedback size limit reached for this session");
    }
    if (feedback.length >= MAX_COUNT) {
      throw new Error("Maximum 10 voice notes per session");
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `clients/${clientId}/voiceFeedback/${eventId}/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          console.error("Voice feedback upload error:", error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            const docData = {
              eventId,
              clientId,
              name: metadata.name,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              duration: metadata.duration,
              storagePath,
              downloadUrl,
              recordedAt: serverTimestamp(),
              uploadedAt: serverTimestamp(),
              uploadedBy: metadata.uploadedBy,
              uploadedByName: metadata.uploadedByName,
              sharedWithParent: metadata.sharedWithParent,
            };

            const docRef = await addDoc(
              collection(db, "clients", clientId, "voiceFeedback"),
              docData
            );

            // Activity logging (non-blocking)
            try {
              await logActivity({
                type: "voice_feedback_recorded",
                userId: metadata.uploadedBy,
                userName: metadata.uploadedByName,
                targetId: clientId,
                targetName: metadata.clientName || clientId,
                metadata: {
                  clientId,
                  clientName: metadata.clientName,
                  eventId,
                  feedbackName: metadata.name,
                  fileName: file.name,
                },
              });
            } catch (e) {
              console.error("Failed to log voice feedback activity:", e);
            }

            // Notify parent if shared (non-blocking)
            if (metadata.sharedWithParent) {
              try {
                await notifyParentVoiceFeedbackShared(clientId, {
                  feedbackId: docRef.id,
                  feedbackName: metadata.name,
                  eventId,
                  sharedByName: metadata.uploadedByName,
                  triggeredByUserId: metadata.uploadedBy,
                });
              } catch (e) {
                console.error("Failed to send voice feedback notification:", e);
              }
            }

            resolve(docRef.id);
          } catch (err) {
            reject(err);
          }
        }
      );
    });
  };

  const deleteFeedback = async (
    item: VoiceFeedback,
    userId: string,
    userName: string,
    clientName?: string
  ): Promise<void> => {
    if (!clientId) return;

    try {
      // Delete from Storage
      const storageRef = ref(storage, item.storagePath);
      await deleteObject(storageRef);
    } catch (err: any) {
      // File might already be deleted, continue with Firestore cleanup
      console.warn("Storage delete warning:", err.message);
    }

    // Delete from Firestore
    await deleteDoc(doc(db, "clients", clientId, "voiceFeedback", item.id));

    // Activity logging (non-blocking)
    try {
      await logActivity({
        type: "voice_feedback_deleted",
        userId,
        userName,
        targetId: clientId,
        targetName: clientName || clientId,
        metadata: {
          clientId,
          clientName,
          eventId: item.eventId,
          feedbackName: item.name,
          fileName: item.fileName,
        },
      });
    } catch (e) {
      console.error("Failed to log voice feedback delete activity:", e);
    }
  };

  const toggleParentAccess = async (
    feedbackId: string,
    shared: boolean,
    userId: string,
    userName: string,
    clientName?: string,
    feedbackName?: string
  ): Promise<void> => {
    if (!clientId) return;

    await updateDoc(doc(db, "clients", clientId, "voiceFeedback", feedbackId), {
      sharedWithParent: shared,
    });

    // Activity logging (non-blocking)
    try {
      await logActivity({
        type: "voice_feedback_shared",
        userId,
        userName,
        targetId: clientId,
        targetName: clientName || clientId,
        metadata: {
          clientId,
          clientName,
          eventId: eventId || "",
          feedbackName: feedbackName || "",
          action: shared ? "shared" : "unshared",
        },
      });
    } catch (e) {
      console.error("Failed to log voice feedback share activity:", e);
    }

    // Notify parent if sharing (non-blocking)
    if (shared) {
      try {
        await notifyParentVoiceFeedbackShared(clientId, {
          feedbackId,
          feedbackName: feedbackName || "Voice note",
          eventId: eventId || "",
          sharedByName: userName,
          triggeredByUserId: userId,
        });
      } catch (e) {
        console.error("Failed to send voice feedback notification:", e);
      }
    }
  };

  return {
    feedback,
    loading,
    error,
    uploadFeedback,
    deleteFeedback,
    toggleParentAccess,
    totalSize,
    canUploadMore,
  };
}
