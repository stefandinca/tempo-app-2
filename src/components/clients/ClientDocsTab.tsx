"use client";

import { useState, useRef } from "react";
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
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useClientDocuments, formatFileSize, ClientDocument } from "@/hooks/useClientDocuments";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { notifyParentDocumentShared } from "@/lib/notificationService";

interface ClientDocsTabProps {
  client: any;
}

const CATEGORIES = [
  { id: "assessment", label: "Assessment", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  { id: "report", label: "Report", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
  { id: "consent", label: "Consent Form", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
  { id: "other", label: "Other", color: "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400" }
];

function getFileIcon(fileType: string) {
  if (fileType.includes("pdf")) return <FileText className="w-5 h-5" />;
  if (fileType.includes("image")) return <Image className="w-5 h-5" />;
  if (fileType.includes("sheet") || fileType.includes("excel")) return <Table className="w-5 h-5" />;
  if (fileType.includes("presentation") || fileType.includes("powerpoint")) return <Presentation className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
}

export default function ClientDocsTab({ client }: ClientDocsTabProps) {
  const { user, userData } = useAuth();
  const { success, error: showError } = useToast();
  const { documents, loading, uploadDocument, deleteDocument, toggleParentAccess } = useClientDocuments(client.id);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState<ClientDocument["category"]>("other");
  const [docDescription, setDocDescription] = useState("");
  const [shareWithParent, setShareWithParent] = useState(true);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        showError("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
      // Auto-fill document name from file name
      setDocName(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !docName.trim()) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedDoc = await uploadDocument(
        selectedFile,
        {
          name: docName.trim(),
          category: docCategory,
          description: docDescription.trim(),
          sharedWithParent: shareWithParent,
          uploadedBy: user?.uid || "",
          uploadedByName: userData?.name || user?.email || "Unknown"
        },
        (progress) => setUploadProgress(progress)
      );

      // Send notification to parents if document is shared with them
      if (shareWithParent && uploadedDoc) {
        const categoryLabel = CATEGORIES.find(c => c.id === docCategory)?.label || "Document";
        try {
          await notifyParentDocumentShared(client.id, {
            documentId: uploadedDoc.id,
            documentName: docName.trim(),
            documentCategory: categoryLabel,
            sharedByName: userData?.name || user?.email || "Your therapy team",
            triggeredByUserId: user?.uid || ""
          });
        } catch (notifyErr) {
          console.error("Failed to send notification:", notifyErr);
          // Don't fail the upload if notification fails
        }
      }

      success("Document uploaded successfully");
      resetUploadForm();
      setIsUploadModalOpen(false);
    } catch (err) {
      showError("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (doc: ClientDocument) => {
    if (!confirm(`Are you sure you want to delete "${doc.name}"? This cannot be undone.`)) return;

    try {
      await deleteDocument(doc);
      success("Document deleted");
      setActiveMenu(null);
    } catch (err) {
      showError("Failed to delete document");
    }
  };

  const handleToggleParentAccess = async (doc: ClientDocument) => {
    const isNowSharing = !doc.sharedWithParent;

    try {
      await toggleParentAccess(doc.id, isNowSharing);

      // Send notification to parents if document is now shared with them
      if (isNowSharing) {
        const categoryLabel = CATEGORIES.find(c => c.id === doc.category)?.label || "Document";
        try {
          await notifyParentDocumentShared(client.id, {
            documentId: doc.id,
            documentName: doc.name,
            documentCategory: categoryLabel,
            sharedByName: userData?.name || user?.email || "Your therapy team",
            triggeredByUserId: user?.uid || ""
          });
        } catch (notifyErr) {
          console.error("Failed to send notification:", notifyErr);
          // Don't fail the action if notification fails
        }
      }

      success(doc.sharedWithParent ? "Document hidden from parent" : "Document shared with parent");
      setActiveMenu(null);
    } catch (err) {
      showError("Failed to update document access");
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setDocName("");
    setDocCategory("other");
    setDocDescription("");
    setShareWithParent(true);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const filteredDocuments = filterCategory === "all"
    ? documents
    : documents.filter(d => d.category === filterCategory);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-4" />
        <p className="text-neutral-500">Loading documents...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Documents</h2>
          <p className="text-sm text-neutral-500">
            {documents.length} document{documents.length !== 1 ? "s" : ""} • {documents.filter(d => d.sharedWithParent).length} shared with parent
          </p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("all")}
          className={clsx(
            "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
            filterCategory === "all"
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
              : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          )}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilterCategory(cat.id)}
            className={clsx(
              "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
              filterCategory === cat.id
                ? cat.color
                : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Document List */}
      {filteredDocuments.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No documents</h3>
          <p className="text-neutral-500 text-sm mt-1 mb-6">
            {filterCategory === "all"
              ? "Upload documents for this client to get started."
              : `No ${CATEGORIES.find(c => c.id === filterCategory)?.label.toLowerCase()} documents found.`
            }
          </p>
          {filterCategory === "all" && (
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Upload First Document
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {filteredDocuments.map(doc => {
              const category = CATEGORIES.find(c => c.id === doc.category);

              return (
                <div
                  key={doc.id}
                  className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center text-neutral-500 flex-shrink-0">
                      {getFileIcon(doc.fileType)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-neutral-900 dark:text-white truncate">
                          {doc.name}
                        </h4>
                        <span className={clsx("px-2 py-0.5 text-xs font-medium rounded-full", category?.color)}>
                          {category?.label}
                        </span>
                        {doc.sharedWithParent && (
                          <span className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <Eye className="w-3 h-3" />
                            Parent
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-sm text-neutral-500">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{doc.uploadedByName}</span>
                        <span>•</span>
                        <span>
                          {doc.uploadedAt?.toDate?.()
                            ? new Date(doc.uploadedAt.toDate()).toLocaleDateString()
                            : "Just now"}
                        </span>
                      </div>

                      {doc.description && (
                        <p className="text-sm text-neutral-500 mt-1 truncate">{doc.description}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a
                        href={doc.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-neutral-500" />
                      </a>

                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === doc.id ? null : doc.id)}
                          className={clsx(
                            "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
                            activeMenu === doc.id && "bg-neutral-100 dark:bg-neutral-800"
                          )}
                        >
                          <MoreVertical className="w-4 h-4 text-neutral-500" />
                        </button>

                        {activeMenu === doc.id && (
                          <>
                            <div
                              className="fixed inset-0 z-10"
                              onClick={() => setActiveMenu(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                              <div className="p-1">
                                <button
                                  onClick={() => handleToggleParentAccess(doc)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                                >
                                  {doc.sharedWithParent ? (
                                    <>
                                      <EyeOff className="w-4 h-4" />
                                      Hide from Parent
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-4 h-4" />
                                      Share with Parent
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDelete(doc)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !isUploading && setIsUploadModalOpen(false)}
          />

          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-lg">Upload Document</h3>
              <button
                onClick={() => !isUploading && setIsUploadModalOpen(false)}
                disabled={isUploading}
                className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* File Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">File</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.png,.jpg,.jpeg,.gif"
                />

                {selectedFile ? (
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center text-primary-600">
                      {getFileIcon(selectedFile.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                      <p className="text-xs text-neutral-500">{formatFileSize(selectedFile.size)}</p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      disabled={isUploading}
                      className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                    <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400">
                      Click to select a file
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">
                      PDF, Word, Excel, PowerPoint, Images (max 10MB)
                    </p>
                  </button>
                )}
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-sm font-medium mb-2">Document Name</label>
                <input
                  type="text"
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  disabled={isUploading}
                  placeholder="e.g., Initial Assessment Report"
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setDocCategory(cat.id as ClientDocument["category"])}
                      disabled={isUploading}
                      className={clsx(
                        "px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        docCategory === cat.id
                          ? cat.color
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-2">Description (optional)</label>
                <textarea
                  value={docDescription}
                  onChange={(e) => setDocDescription(e.target.value)}
                  disabled={isUploading}
                  placeholder="Brief description of the document..."
                  rows={2}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl resize-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
                />
              </div>

              {/* Share with Parent */}
              <label className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl cursor-pointer">
                <input
                  type="checkbox"
                  checked={shareWithParent}
                  onChange={(e) => setShareWithParent(e.target.checked)}
                  disabled={isUploading}
                  className="w-5 h-5 rounded border-neutral-300 text-primary-500 focus:ring-primary-500"
                />
                <div>
                  <p className="font-medium text-sm">Share with parent</p>
                  <p className="text-xs text-neutral-500">Parent can view and download this document</p>
                </div>
              </label>

              {/* Progress Bar */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-neutral-600 dark:text-neutral-400">Uploading...</span>
                    <span className="font-medium">{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-4 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => {
                  resetUploadForm();
                  setIsUploadModalOpen(false);
                }}
                disabled={isUploading}
                className="flex-1 px-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !docName.trim() || isUploading}
                className="flex-1 px-4 py-2.5 bg-primary-500 text-white rounded-xl font-medium hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
