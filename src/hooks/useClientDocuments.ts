import { useState, useEffect } from "react";
import { db, storage } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject
} from "firebase/storage";

export interface ClientDocument {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath: string;
  downloadUrl: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: any;
  category: "assessment" | "report" | "consent" | "other";
  description?: string;
  sharedWithParent: boolean;
}

export function useClientDocuments(clientId: string | null) {
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", clientId, "documents"),
      orderBy("uploadedAt", "desc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: ClientDocument[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as ClientDocument);
        });
        setDocuments(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching documents:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  const uploadDocument = async (
    file: File,
    metadata: {
      name: string;
      category: ClientDocument["category"];
      description?: string;
      sharedWithParent: boolean;
      uploadedBy: string;
      uploadedByName: string;
    },
    onProgress?: (progress: number) => void
  ): Promise<ClientDocument | null> => {
    if (!clientId) return null;

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
      const storagePath = `clients/${clientId}/documents/${timestamp}_${sanitizedFileName}`;
      const storageRef = ref(storage, storagePath);

      // Upload file with progress tracking
      return new Promise((resolve, reject) => {
        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on(
          "state_changed",
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress?.(progress);
          },
          (error) => {
            console.error("Upload error:", error);
            reject(error);
          },
          async () => {
            // Get download URL
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

            // Save metadata to Firestore
            const docData = {
              name: metadata.name,
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size,
              storagePath,
              downloadUrl,
              uploadedBy: metadata.uploadedBy,
              uploadedByName: metadata.uploadedByName,
              uploadedAt: serverTimestamp(),
              category: metadata.category,
              description: metadata.description || "",
              sharedWithParent: metadata.sharedWithParent
            };

            const docRef = await addDoc(
              collection(db, "clients", clientId, "documents"),
              docData
            );

            resolve({ id: docRef.id, ...docData } as ClientDocument);
          }
        );
      });
    } catch (err: any) {
      console.error("Error uploading document:", err);
      throw err;
    }
  };

  const deleteDocument = async (document: ClientDocument): Promise<void> => {
    if (!clientId) return;

    try {
      // Delete from Storage
      const storageRef = ref(storage, document.storagePath);
      await deleteObject(storageRef);

      // Delete from Firestore
      await deleteDoc(doc(db, "clients", clientId, "documents", document.id));
    } catch (err: any) {
      console.error("Error deleting document:", err);
      throw err;
    }
  };

  const toggleParentAccess = async (
    documentId: string,
    sharedWithParent: boolean
  ): Promise<void> => {
    if (!clientId) return;

    try {
      await updateDoc(doc(db, "clients", clientId, "documents", documentId), {
        sharedWithParent
      });
    } catch (err: any) {
      console.error("Error updating document access:", err);
      throw err;
    }
  };

  return {
    documents,
    loading,
    error,
    uploadDocument,
    deleteDocument,
    toggleParentAccess
  };
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

// Helper to get file icon based on type
export function getFileTypeIcon(fileType: string): string {
  if (fileType.includes("pdf")) return "file-text";
  if (fileType.includes("image")) return "image";
  if (fileType.includes("word") || fileType.includes("document")) return "file-text";
  if (fileType.includes("sheet") || fileType.includes("excel")) return "table";
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return "presentation";
  return "file";
}
