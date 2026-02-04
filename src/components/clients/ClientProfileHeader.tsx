"use client";

import { ArrowLeft, Edit, MoreVertical, Archive, Trash2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

interface ClientProfileHeaderProps {
  client: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onEdit: () => void;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "evaluations", label: "Evaluations" },
  { id: "programs", label: "Programs" },
  { id: "plan", label: "Plan" },
  { id: "docs", label: "Docs" },
];

export default function ClientProfileHeader({ client, activeTab, onTabChange, onEdit }: ClientProfileHeaderProps) {
  const { userRole } = useAuth();
  const { success, error } = useToast();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === 'Admin';
  const isCoordinator = userRole === 'Coordinator';
  const canEdit = isAdmin || isCoordinator;

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleArchive = async () => {
    try {
      const clientRef = doc(db, "clients", client.id);
      await updateDoc(clientRef, { isArchived: !client.isArchived });
      success(client.isArchived ? "Client restored" : "Client archived");
      setIsMenuOpen(false);
    } catch (err) {
      console.error(err);
      error("Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete ${client.name}? This cannot be undone.`)) return;
    
    try {
      await deleteDoc(doc(db, "clients", client.id));
      success("Client deleted forever");
      router.push("/clients/");
    } catch (err) {
      console.error(err);
      error("Failed to delete client");
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/clients/"
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{client.name}</h1>
            {client.isArchived && (
              <span className="px-2 py-0.5 bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                <Archive className="w-3 h-3" />
                Archived
              </span>
            )}
          </div>
        </div>
        
        {canEdit && (
          <div className="flex items-center gap-2 relative" ref={menuRef}>
            <button 
              onClick={onEdit}
              className="flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm font-medium"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </button>
            
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={clsx(
                "p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors",
                isMenuOpen && "bg-neutral-100 dark:bg-neutral-800"
              )}
            >
              <MoreVertical className="w-5 h-5 text-neutral-500" />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-1">
                  <button 
                    onClick={handleArchive}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    {client.isArchived ? "Restore Client" : "Archive Client"}
                  </button>
                  
                  {isAdmin && (
                    <button 
                      onClick={handleDelete}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap",
              activeTab === tab.id
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
