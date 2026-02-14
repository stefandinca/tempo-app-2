"use client";

import { ArrowLeft, Edit, MoreVertical, Archive, Trash2, ShieldAlert, ChevronDown, Check } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";
import { useData } from "@/context/DataContext";

interface ClientProfileHeaderProps {
  client: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onEdit: () => void;
}

export default function ClientProfileHeader({ client, activeTab, onTabChange, onEdit }: ClientProfileHeaderProps) {
  const { t } = useTranslation();
  const { userRole } = useAuth();
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { clients: clientsData, systemSettings } = useData();
  const router = useRouter();
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const tabMenuRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === 'Admin' || userRole === 'Superadmin';
  const isCoordinator = userRole === 'Coordinator';
  const canEdit = isAdmin || isCoordinator;

  const TABS = [
    { id: "overview", label: t('clients.tabs.overview') },
    { id: "evaluations", label: t('clients.tabs.evaluations') },
    { id: "notes", label: t('clients.tabs.notes') },
    { id: "plan", label: t('clients.tabs.plan') },
    { id: "homework", label: t('clients.tabs.homework') },
    { id: "docs", label: t('clients.tabs.docs') },
  ];

  if (isAdmin) {
    TABS.push({ id: "billing", label: t('clients.tabs.billing') || "Billing" });
  }

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || activeTab;

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
      if (tabMenuRef.current && !tabMenuRef.current.contains(event.target as Node)) {
        setIsTabMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleArchive = async () => {
    if (client.isArchived) {
      const maxClients = systemSettings?.maxActiveClients || 0;
      if (maxClients > 0) {
        const activeCount = clientsData.data.filter((c: any) => !c.isArchived).length;
        if (activeCount >= maxClients) {
          customConfirm({
            title: t('limits.client_limit_reached_title'),
            message: t('limits.client_limit_reached_message', { max: maxClients }),
            confirmLabel: 'OK',
            variant: 'warning',
            onConfirm: () => {},
          });
          setIsMenuOpen(false);
          return;
        }
      }
    }

    try {
      const clientRef = doc(db, "clients", client.id);
      await updateDoc(clientRef, { isArchived: !client.isArchived });
      success(client.isArchived ? t('clients.client_restored') : t('clients.client_archived'));
      setIsMenuOpen(false);
    } catch (err) {
      console.error(err);
      error(t('clients.update_error'));
    }
  };

  const handleDelete = async () => {
    customConfirm({
      title: t('clients.delete_forever'),
      message: t('clients.delete_forever_confirm', { name: client.name }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "clients", client.id));
          success(t('clients.client_deleted'));
          router.push("/clients/");
        } catch (err) {
          console.error(err);
          error(t('clients.delete_error'));
        }
      }
    });
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
            <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white font-display">{client.name}</h1>
            {client.isArchived && (
              <span className="px-2 py-0.5 bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400 text-[10px] font-bold uppercase rounded-md flex items-center gap-1">
                <Archive className="w-3 h-3" />
                {t('clients.status.archived')}
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
              <span className="hidden sm:inline">{t('clients.edit_profile')}</span>
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

            {isMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-1">
                  <button 
                    onClick={handleArchive}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                    {client.isArchived ? t('clients.restore_client') : t('clients.archive_client')}
                  </button>
                  
                  {isAdmin && (
                    <button 
                      onClick={handleDelete}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      {t('clients.delete_forever')}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs / Mobile Dropdown */}
      <div className="relative">
        <div className="md:hidden relative" ref={tabMenuRef}>
          <button
            onClick={() => setIsTabMenuOpen(!isTabMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold text-neutral-900 dark:text-white shadow-sm"
          >
            <span className="flex items-center gap-2 text-primary-600">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              {activeTabLabel}
            </span>
            <ChevronDown className={clsx("w-4 h-4 text-neutral-400 transition-transform", isTabMenuOpen && "rotate-180")} />
          </button>

          {isTabMenuOpen && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="p-1 max-h-[60vh] overflow-y-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      onTabChange(tab.id);
                      setIsTabMenuOpen(false);
                    }}
                    className={clsx(
                      "w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-colors",
                      activeTab === tab.id
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    )}
                  >
                    {tab.label}
                    {activeTab === tab.id && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block relative group">
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
      </div>
    </div>
  );
}
