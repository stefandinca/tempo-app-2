"use client";

import { useState, useEffect } from "react";
import { FileText, Download, File, Image, Table, Presentation, FolderOpen, Loader2 } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { clsx } from "clsx";

interface Document {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  downloadUrl: string;
  uploadedAt: any;
  category: "assessment" | "report" | "consent" | "other";
  description?: string;
}

const CATEGORIES = [
  { id: "assessment", label: "Assessment", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { id: "report", label: "Report", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { id: "consent", label: "Consent Form", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { id: "other", label: "Other", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400" }
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <FileText className="w-5 h-5" />;
  if (fileType.includes("image")) return <Image className="w-5 h-5" />;
  if (fileType.includes("sheet") || fileType.includes("excel")) return <Table className="w-5 h-5" />;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return <Presentation className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
}

export default function ParentDocsPage() {
  const { data: client, loading: clientLoading, error: clientError } = usePortalData();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch documents shared with parent
  useEffect(() => {
    if (!client?.id) {
      setDocsLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", client.id, "documents"),
      where("sharedWithParent", "==", true),
      orderBy("uploadedAt", "desc")
    );

    console.log("[ParentDocs] Setting up documents listener for client:", client.id);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log("[ParentDocs] Received snapshot, docs count:", snapshot.size);
        const docs: Document[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as Document);
        });
        setDocuments(docs);
        setDocsLoading(false);
      },
      (err) => {
        console.error("[ParentDocs] Error fetching documents:", err);
        console.error("[ParentDocs] Error code:", err.code);
        console.error("[ParentDocs] Error message:", err.message);
        // Check if it's a permissions error - may need to log in again
        if (err.code === 'permission-denied') {
          console.error("[ParentDocs] Permission denied - user may need to re-authenticate");
        }
        setDocsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [client?.id]);

  if (clientLoading) return <PortalLoading />;
  if (clientError || !client) return <PortalError message={clientError || "Could not load documents."} />;

  const filteredDocuments = filterCategory === "all"
    ? documents
    : documents.filter(d => d.category === filterCategory);

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Documents</h1>
        <p className="text-neutral-500 text-sm">
          {documents.length} document{documents.length !== 1 ? "s" : ""} available for {client.name}
        </p>
      </header>

      {/* Filters */}
      {documents.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFilterCategory("all")}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              filterCategory === "all"
                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            )}
          >
            All
          </button>
          {CATEGORIES.map(cat => {
            const count = documents.filter(d => d.category === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={clsx(
                  "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                  filterCategory === cat.id
                    ? cat.color
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                )}
              >
                {cat.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {docsLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
          <p className="text-neutral-500">Loading documents...</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {documents.length === 0 ? "No documents shared" : "No matching documents"}
          </h3>
          <p className="text-neutral-500 text-sm mt-1">
            {documents.length === 0
              ? "Reports and assessments will appear here when shared by your therapy team."
              : "Try selecting a different category."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map(doc => {
            const category = CATEGORIES.find(c => c.id === doc.category);

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center text-primary-500 flex-shrink-0">
                    {getFileIcon(doc.fileType)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h4 className="font-semibold text-neutral-900 dark:text-white">
                        {doc.name}
                      </h4>
                      <span className={clsx("px-2 py-0.5 text-xs font-medium rounded-full", category?.color)}>
                        {category?.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-neutral-500 mb-2">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span>
                        {doc.uploadedAt?.toDate?.()
                          ? new Date(doc.uploadedAt.toDate()).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric"
                            })
                          : "Recently uploaded"}
                      </span>
                    </div>

                    {doc.description && (
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">{doc.description}</p>
                    )}
                  </div>

                  {/* Download Button */}
                  <a
                    href={doc.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.fileName}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden sm:inline">Download</span>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}