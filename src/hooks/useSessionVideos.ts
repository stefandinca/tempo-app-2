"use client";

import { useState, useEffect, useMemo } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  query,
  where,
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
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { logActivity } from "@/lib/activityService";
import { notifyParentVideoShared } from "@/lib/notificationService";

export interface SessionVideo {
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
  thumbnailPath: string | null;
  thumbnailUrl: string | null;
  recordedAt: any;
  uploadedAt: any;
  uploadedBy: string;
  uploadedByName: string;
  sharedWithParent: boolean;
}

export interface VideoUploadMetadata {
  name: string;
  duration: number;
  sharedWithParent: boolean;
  uploadedBy: string;
  uploadedByName: string;
  clientName?: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB
const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500 MB
const MAX_COUNT = 20;

/**
 * Generate a thumbnail from a video blob at the 1-second mark.
 * Returns a JPEG Blob or null if generation fails.
 */
async function generateThumbnail(videoBlob: Blob): Promise<Blob | null> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.muted = true;
      video.playsInline = true;

      const url = URL.createObjectURL(videoBlob);
      video.src = url;

      video.onloadeddata = () => {
        // Seek to 1 second or half duration if shorter
        video.currentTime = Math.min(1, video.duration / 2);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const scale = 320 / video.videoWidth;
          canvas.width = 320;
          canvas.height = Math.round(video.videoHeight * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              URL.revokeObjectURL(url);
              resolve(blob);
            },
            "image/jpeg",
            0.7
          );
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      // Timeout after 5 seconds
      setTimeout(() => {
        URL.revokeObjectURL(url);
        resolve(null);
      }, 5000);
    } catch {
      resolve(null);
    }
  });
}

export function useSessionVideos(clientId: string | null, eventId: string | null) {
  const [videos, setVideos] = useState<SessionVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !eventId) {
      setVideos([]);
      setLoading(false);
      return;
    }

    // No orderBy to avoid needing a composite index — sort client-side instead
    const q = query(
      collection(db, "clients", clientId, "videos"),
      where("eventId", "==", eventId)
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
        console.error("Error fetching session videos:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, eventId]);

  const totalSize = useMemo(
    () => videos.reduce((sum, v) => sum + (v.fileSize || 0), 0),
    [videos]
  );

  const canUploadMore = videos.length < MAX_COUNT && totalSize < MAX_TOTAL_SIZE;

  const uploadVideo = async (
    file: File | Blob,
    metadata: VideoUploadMetadata,
    onProgress?: (progress: number) => void
  ): Promise<string | null> => {
    if (!clientId || !eventId) return null;

    const fileSize = file.size;
    if (fileSize > MAX_FILE_SIZE) {
      throw new Error("Video must be under 100MB");
    }
    if (totalSize + fileSize > MAX_TOTAL_SIZE) {
      throw new Error("Total video size limit reached for this session");
    }
    if (videos.length >= MAX_COUNT) {
      throw new Error("Maximum 20 videos per session");
    }

    const timestamp = Date.now();
    const fileName = file instanceof File ? file.name : `recording_${timestamp}.webm`;
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `clients/${clientId}/videos/${eventId}/${timestamp}_${sanitizedName}`;
    const storageRef = ref(storage, storagePath);

    // Generate thumbnail
    const thumbBlob = await generateThumbnail(file instanceof Blob ? file : file);
    let thumbnailPath: string | null = null;
    let thumbnailUrl: string | null = null;

    if (thumbBlob) {
      thumbnailPath = `${storagePath}_thumb.jpg`;
      try {
        const thumbRef = ref(storage, thumbnailPath);
        await uploadBytes(thumbRef, thumbBlob, { contentType: "image/jpeg" });
        thumbnailUrl = await getDownloadURL(thumbRef);
      } catch (e) {
        console.warn("Thumbnail upload failed, continuing without:", e);
        thumbnailPath = null;
        thumbnailUrl = null;
      }
    }

    const fileType = file instanceof File ? file.type : (file.type || "video/webm");

    return new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          console.error("Video upload error:", error);
          reject(error);
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            const docData = {
              eventId,
              clientId,
              name: metadata.name,
              fileName,
              fileType,
              fileSize,
              duration: metadata.duration,
              storagePath,
              downloadUrl,
              thumbnailPath,
              thumbnailUrl,
              recordedAt: serverTimestamp(),
              uploadedAt: serverTimestamp(),
              uploadedBy: metadata.uploadedBy,
              uploadedByName: metadata.uploadedByName,
              sharedWithParent: metadata.sharedWithParent,
            };

            const docRef = await addDoc(
              collection(db, "clients", clientId, "videos"),
              docData
            );

            // Activity logging (non-blocking)
            try {
              await logActivity({
                type: "video_uploaded",
                userId: metadata.uploadedBy,
                userName: metadata.uploadedByName,
                targetId: clientId,
                targetName: metadata.clientName || clientId,
                metadata: {
                  clientId,
                  clientName: metadata.clientName,
                  eventId,
                  videoName: metadata.name,
                  fileName,
                },
              });
            } catch (e) {
              console.error("Failed to log video upload activity:", e);
            }

            // Notify parent if shared (non-blocking)
            if (metadata.sharedWithParent) {
              try {
                await notifyParentVideoShared(clientId, {
                  videoId: docRef.id,
                  videoName: metadata.name,
                  eventId,
                  sharedByName: metadata.uploadedByName,
                  triggeredByUserId: metadata.uploadedBy,
                });
              } catch (e) {
                console.error("Failed to send video notification:", e);
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

  const deleteVideo = async (
    item: SessionVideo,
    userId: string,
    userName: string,
    clientName?: string
  ): Promise<void> => {
    if (!clientId) return;

    // Delete video from Storage
    try {
      const storageRef = ref(storage, item.storagePath);
      await deleteObject(storageRef);
    } catch (err: any) {
      console.warn("Storage delete warning (video):", err.message);
    }

    // Delete thumbnail from Storage
    if (item.thumbnailPath) {
      try {
        const thumbRef = ref(storage, item.thumbnailPath);
        await deleteObject(thumbRef);
      } catch (err: any) {
        console.warn("Storage delete warning (thumbnail):", err.message);
      }
    }

    // Delete from Firestore
    await deleteDoc(doc(db, "clients", clientId, "videos", item.id));

    // Activity logging (non-blocking)
    try {
      await logActivity({
        type: "video_deleted",
        userId,
        userName,
        targetId: clientId,
        targetName: clientName || clientId,
        metadata: {
          clientId,
          clientName,
          eventId: item.eventId,
          videoName: item.name,
          fileName: item.fileName,
        },
      });
    } catch (e) {
      console.error("Failed to log video delete activity:", e);
    }
  };

  const toggleParentAccess = async (
    videoId: string,
    shared: boolean,
    userId: string,
    userName: string,
    clientName?: string,
    videoName?: string
  ): Promise<void> => {
    if (!clientId) return;

    await updateDoc(doc(db, "clients", clientId, "videos", videoId), {
      sharedWithParent: shared,
    });

    // Activity logging (non-blocking)
    try {
      await logActivity({
        type: "video_shared",
        userId,
        userName,
        targetId: clientId,
        targetName: clientName || clientId,
        metadata: {
          clientId,
          clientName,
          eventId: eventId || "",
          videoName: videoName || "",
          action: shared ? "shared" : "unshared",
        },
      });
    } catch (e) {
      console.error("Failed to log video share activity:", e);
    }

    // Notify parent if sharing (non-blocking)
    if (shared) {
      try {
        await notifyParentVideoShared(clientId, {
          videoId,
          videoName: videoName || "Session video",
          eventId: eventId || "",
          sharedByName: userName,
          triggeredByUserId: userId,
        });
      } catch (e) {
        console.error("Failed to send video notification:", e);
      }
    }
  };

  return {
    videos,
    loading,
    error,
    uploadVideo,
    deleteVideo,
    toggleParentAccess,
    totalSize,
    canUploadMore,
  };
}
