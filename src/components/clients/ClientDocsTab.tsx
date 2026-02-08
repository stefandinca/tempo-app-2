"use client";

import { useState, useRef, useEffect } from "react";
import { clsx } from "clsx";
import {
  Upload,
  FileText,
  Image,
  File,
  Table,
  Presentation,
  Trash2,
  Download,
  Eye,
  EyeOff,
  MoreVertical,
  X,
  Loader2,
  FolderOpen,
  Plus,
  BarChart,
  ExternalLink,
  Share2
} from "lucide-react";
import { useClientDocuments, formatFileSize, ClientDocument } from "@/hooks/useClientDocuments";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { notifyParentDocumentShared } from "@/lib/notificationService";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";

interface ClientDocsTabProps {
  client: any;
}

function getFileIcon(fileType: string) {
  if (fileType?.includes("pdf")) return <FileText className="w-5 h-5" />;
  if (fileType?.includes("image")) return <Image className="w-5 h-5" />;
  if (fileType?.includes("report")) return <BarChart className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
}

export default function ClientDocsTab({ client }: ClientDocsTabProps) {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { success, error: showError } = useToast();
  const { documents, loading: docsLoading, uploadDocument, deleteDocument, toggleParentAccess } = useClientDocuments(client.id);

  // States for Reports (Fetched separately)
  const [reports, setReports] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(true);

  // UI States
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState<string>("other");
  const [shareWithParent, setShareWithParent] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = [
    { id: "report", label: t('reports.client.title'), color: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" },
    { id: "assessment", label: t('parent_portal.docs.categories.assessment'), color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { id: "consent", label: t('parent_portal.docs.categories.consent'), color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    { id: "other", label: t('parent_portal.docs.categories.other'), color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400" }
  ];

  // 1. Fetch Reports in real-time
  useEffect(() => {
    const q = query(collection(db, "clients", client.id, "reports"), orderBy("generatedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setReportsLoading(false);
    });
    return () => unsubscribe();
  }, [client.id]);

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm(t('common.delete_confirm') || "Are you sure?")) return;
    try {
      await deleteDoc(doc(db, "clients", client.id, "reports", reportId));
      success(t('common.success'));
    } catch (err) {
      showError(t('common.error'));
    }
  };

  const handleToggleReportShare = async (report: any) => {
    try {
      const newSharedState = !report.sharedWithParent;
      await updateDoc(doc(db, "clients", client.id, "reports", report.id), {
        sharedWithParent: newSharedState
      });
      
      if (newSharedState) {
        // Notify parent
        const { notifyParentReportGenerated } = await import("@/lib/notificationService");
        await notifyParentReportGenerated(client.id, {
          reportType: report.type || "Report",
          reportTitle: report.name || "Progress Report",
          reportId: report.id,
          triggeredByUserId: user?.uid || ""
        });
      }

      success(newSharedState ? "Report shared" : "Report hidden");
    } catch (err) {
      console.error("Error toggling report share:", err);
      showError("Failed to update share status");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      setDocName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !docName.trim()) return;
    setIsUploading(true);
    try {
      const metadata = {
        name: docName.trim(),
        category: docCategory as any,
        sharedWithParent: shareWithParent,
        uploadedBy: user?.uid || "",
        uploadedByName: userData?.name || user?.email || "Staff"
      };

      const result = await uploadDocument(selectedFile, metadata, setUploadProgress);
      
      if (result && shareWithParent) {
        // Notify parent
        const { notifyParentDocumentShared } = await import("@/lib/notificationService");
        await notifyParentDocumentShared(client.id, {
          documentId: result.id,
          documentName: metadata.name,
          documentCategory: metadata.category,
          sharedByName: metadata.uploadedByName,
          triggeredByUserId: user?.uid || ""
        });
      }

      success(t('common.success'));
      setIsUploadModalOpen(false);
      setSelectedFile(null);
    } catch (err) {
      showError(t('common.error'));
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleDocumentShare = async (docItem: any) => {
    try {
      const newSharedState = !docItem.sharedWithParent;
      await toggleParentAccess(docItem.id, newSharedState);
      
      if (newSharedState) {
        // Notify parent
        const { notifyParentDocumentShared } = await import("@/lib/notificationService");
        await notifyParentDocumentShared(client.id, {
          documentId: docItem.id,
          documentName: docItem.name,
          documentCategory: docItem.category,
          sharedByName: userData?.name || user?.email || "Staff",
          triggeredByUserId: user?.uid || ""
        });
      }

      success(newSharedState ? "Document shared" : "Document hidden");
    } catch (err) {
      console.error("Error toggling document share:", err);
      showError("Failed to update share status");
    }
  };

  const allItems = [
    ...reports.map(r => ({ ...r, isReport: true, category: 'report' })),
    ...documents.map(d => ({ ...d, isReport: false }))
  ].sort((a, b) => {
    const dateA = a.generatedAt || a.uploadedAt;
    const dateB = b.generatedAt || b.uploadedAt;
    return (dateB?.seconds || 0) - (dateA?.seconds || 0);
  });

  const filteredItems = filterCategory === "all" 
    ? allItems 
    : allItems.filter(item => item.category === filterCategory);

  if (docsLoading || reportsLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
        <p className="text-neutral-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white font-display">{t('parent_portal.docs.title')}</h2>
          <p className="text-sm text-neutral-500">
            {allItems.length} {t('common.actions').toLowerCase()}
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
        >
          <Upload className="w-4 h-4" />
          {t('parent_portal.docs.recently_uploaded')}
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={clsx(
            "px-4 py-2 text-sm font-bold rounded-xl transition-all",
            filterCategory === "all"
              ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          )}
        >
          {t('parent_portal.docs.all')}
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={clsx(
              "px-4 py-2 text-sm font-bold rounded-xl transition-all",
              filterCategory === cat.id
                ? cat.color
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Combined List */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {filteredItems.map((item: any) => (
            <div key={item.id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className={clsx(
                  "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                  item.isReport ? "bg-primary-50 text-primary-600" : "bg-neutral-100 text-neutral-500"
                )}>
                  {getFileIcon(item.isReport ? 'report' : item.fileType)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-bold text-neutral-900 dark:text-white truncate">{item.name}</h4>
                    {item.sharedWithParent && (
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-success-100 text-success-700">
                        {t('common.success').toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    {item.isReport ? t('reports.client.title') : (CATEGORIES.find(c => c.id === item.category)?.label || 'Doc')} • 
                    {new Date((item.generatedAt || item.uploadedAt)?.seconds * 1000).toLocaleDateString('ro-RO')}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {item.isReport ? (
                    <button 
                      onClick={() => window.open(`/reports/client?id=${client.id}`, '_blank')}
                      className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                      title="View Report"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  ) : (
                    <a href={item.downloadUrl} target="_blank" className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                      <Download className="w-4 h-4" />
                    </a>
                  )}

                  <div className="relative">
                    <button 
                      onClick={() => setActiveMenu(activeMenu === item.id ? null : item.id)}
                      className="p-2 text-neutral-400 hover:bg-neutral-100 rounded-lg"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {activeMenu === item.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenu(null)} />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 rounded-xl shadow-xl z-20 py-1">
                          <button 
                            onClick={() => {
                              item.isReport ? handleToggleReportShare(item) : handleToggleDocumentShare(item);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50"
                          >
                            {item.sharedWithParent ? <EyeOff className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                            {item.sharedWithParent ? "Hide from Parent" : "Share with Parent"}
                          </button>
                          <button 
                            onClick={() => {
                              item.isReport ? handleDeleteReport(item.id) : deleteDocument(item);
                              setActiveMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 border-t border-neutral-100"
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('common.delete')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="py-20 text-center text-neutral-500 italic">No documents found.</div>
          )}
        </div>
      </div>

      {/* Upload Modal (Placeholder for brevity, matches existing logic) */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold">Upload Document</h3>
                <button onClick={() => setIsUploadModalOpen(false)}><X className="w-5 h-5" /></button>
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="mb-4" />
              <input 
                type="text" 
                value={docName} 
                onChange={e => setDocName(e.target.value)} 
                placeholder="Document Name" 
                className="w-full p-2 border rounded-lg mb-4 bg-neutral-50"
              />
              <button 
                onClick={handleUpload}
                disabled={isUploading}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-bold"
              >
                {isUploading ? "Uploading..." : "Start Upload"}
              </button>
           </div>
        </div>
      )}
    </div>
  );
}