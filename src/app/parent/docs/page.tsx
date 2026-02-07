"use client";

import { useState, useEffect } from "react";
import { FileText, Download, File, Image, Table, Presentation, FolderOpen, Loader2, Grid3X3, List } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

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
  { id: "assessment", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: "bg-blue-50 dark:bg-blue-900/20 text-blue-500" },
  { id: "report", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: "bg-green-50 dark:bg-green-900/20 text-green-500" },
  { id: "consent", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: "bg-purple-50 dark:bg-purple-900/20 text-purple-500" },
  { id: "other", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400", icon: "bg-neutral-50 dark:bg-neutral-800 text-neutral-500" }
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

type ViewMode = "list" | "grid";

export default function ParentDocsPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith('ro') ? 'ro-RO' : 'en-US';
  const { data: client, loading: clientLoading, error: clientError } = usePortalData();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: Document[] = [];
        snapshot.forEach((doc) => {
          docs.push({ id: doc.id, ...doc.data() } as Document);
        });
        setDocuments(docs);
        setDocsLoading(false);
      },
      (err) => {
        console.error("[ParentDocs] Error fetching documents:", err);
        setDocsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [client?.id]);

  if (clientLoading) return <PortalLoading />;
  if (clientError || !client) return <PortalError message={clientError || t("parent_portal.dashboard.load_error")} />;

  const filteredDocuments = filterCategory === "all"
    ? documents
    : documents.filter(d => d.category === filterCategory);

  const handleDownload = async (doc: Document) => {
    setDownloadingId(doc.id);
    try {
      const link = document.createElement("a");
      link.href = doc.downloadUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = doc.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-300 pb-24">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t('parent_portal.docs.title')}</h1>
          <p className="text-neutral-400 text-sm">
            {documents.length === 1
              ? t('parent_portal.docs.subtitle_single', { name: client.name })
              : t('parent_portal.docs.subtitle', { count: documents.length, name: client.name })}
          </p>
        </div>
        {documents.length > 0 && (
          <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
            <button
              onClick={() => setViewMode("list")}
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === "list" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary-600" : "text-neutral-400"
              )}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={clsx(
                "p-2 rounded-lg transition-all",
                viewMode === "grid" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary-600" : "text-neutral-400"
              )}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
        )}
      </header>

      {/* Category Filters */}
      {documents.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setFilterCategory("all")}
            className={clsx(
              "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap",
              filterCategory === "all"
                ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
            )}
          >
            {t('parent_portal.docs.all')} ({documents.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = documents.filter(d => d.category === cat.id).length;
            if (count === 0) return null;
            return (
              <button
                key={cat.id}
                onClick={() => setFilterCategory(cat.id)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-bold rounded-lg transition-colors whitespace-nowrap",
                  filterCategory === cat.id
                    ? cat.color
                    : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                )}
              >
                {t(`parent_portal.docs.categories.${cat.id}`)} ({count})
              </button>
            );
          })}
        </div>
      )}

      {docsLoading ? (
        <div className="py-16 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
          <p className="text-neutral-400 text-sm">{t('common.loading')}</p>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-7 h-7 text-neutral-300 dark:text-neutral-600" />
          </div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            {documents.length === 0 ? t('parent_portal.docs.no_docs') : t('parent_portal.docs.no_matching')}
          </h3>
          <p className="text-neutral-400 text-sm mt-1">
            {documents.length === 0
              ? t('parent_portal.docs.no_docs_subtitle')
              : t('parent_portal.docs.no_matching_subtitle')}
          </p>
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="space-y-2">
          {filteredDocuments.map(doc => {
            const category = CATEGORIES.find(c => c.id === doc.category);
            const isDownloading = downloadingId === doc.id;

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 hover:shadow transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", category?.icon || "bg-neutral-50 text-neutral-500")}>
                    {getFileIcon(doc.fileType)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
                        {doc.name}
                      </h4>
                      <span className={clsx("px-2 py-0.5 text-[10px] font-bold rounded-full flex-shrink-0", category?.color)}>
                        {t(`parent_portal.docs.categories.${doc.category}`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>&middot;</span>
                      <span>
                        {doc.uploadedAt?.toDate?.()
                          ? new Date(doc.uploadedAt.toDate()).toLocaleDateString(currentLang, {
                              month: "short",
                              day: "numeric",
                              year: "numeric"
                            })
                          : t('parent_portal.docs.recently_uploaded')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors flex-shrink-0 disabled:opacity-50"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    <span className="hidden sm:inline">{t('parent_portal.docs.download')}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Grid View */
        <div className="grid grid-cols-2 gap-3">
          {filteredDocuments.map(doc => {
            const category = CATEGORIES.find(c => c.id === doc.category);
            const isDownloading = downloadingId === doc.id;

            return (
              <div
                key={doc.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 hover:shadow transition-shadow flex flex-col"
              >
                <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-3", category?.icon || "bg-neutral-50 text-neutral-500")}>
                  {getFileIcon(doc.fileType)}
                </div>
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-white line-clamp-2 mb-1">
                  {doc.name}
                </h4>
                <span className={clsx("px-2 py-0.5 text-[10px] font-bold rounded-full self-start mb-2", category?.color)}>
                  {t(`parent_portal.docs.categories.${doc.category}`)}
                </span>
                <p className="text-[10px] text-neutral-400 mt-auto">{formatFileSize(doc.fileSize)}</p>
                <button
                  onClick={() => handleDownload(doc)}
                  disabled={isDownloading}
                  className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors disabled:opacity-50"
                >
                  {isDownloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {t('parent_portal.docs.download')}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
