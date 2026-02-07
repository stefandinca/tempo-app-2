"use client";

import { useState, useMemo } from "react";
import { ClipboardList, CheckCircle2, Circle, Clock, StickyNote, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useHomework } from "@/hooks/useCollections";
import { useTeamMembers } from "@/hooks/useCollections";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type FilterTab = "active" | "completed";

export default function ParentHomeworkPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: client, loading: portalLoading, error: portalError } = usePortalData();
  const { data: homework, loading: homeworkLoading } = useHomework(client?.id || "");
  const { data: team } = useTeamMembers();
  const [activeTab, setActiveTab] = useState<FilterTab>("active");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loading = portalLoading || homeworkLoading;

  const activeItems = useMemo(() => homework.filter((h) => !h.completed), [homework]);
  const completedItems = useMemo(() => homework.filter((h) => h.completed), [homework]);
  const displayItems = activeTab === "active" ? activeItems : completedItems;

  if (loading) return <PortalLoading />;
  if (portalError || !client) return <PortalError message={portalError || t("parent_portal.dashboard.load_error")} />;

  const getTherapistName = (therapistId: string) => {
    const therapist = (team || []).find((t) => t.id === therapistId);
    return therapist?.name || t("parent_portal.homework.therapist");
  };

  const frequencyLabel = (freq: string) => {
    const labels: Record<string, string> = {
      daily: t("parent_portal.homework.daily"),
      weekly: t("parent_portal.homework.weekly"),
      "3x_week": t("parent_portal.homework.three_times_week"),
      as_needed: t("parent_portal.homework.as_needed"),
    };
    return labels[freq] || freq;
  };

  const handleToggleComplete = async (item: any) => {
    setUpdatingId(item.id);
    try {
      const ref = doc(db, "clients", client.id, "homework", item.id);
      await updateDoc(ref, {
        completed: !item.completed,
        completedAt: !item.completed ? new Date().toISOString() : null,
      });
    } catch (err) {
      console.error("Failed to update homework:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (item: any) => {
    const note = notes[item.id];
    if (note === undefined) return;
    setUpdatingId(item.id);
    try {
      const ref = doc(db, "clients", client.id, "homework", item.id);
      await updateDoc(ref, { parentNotes: note });
    } catch (err) {
      console.error("Failed to save notes:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-300 pb-24">
      <header>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t("parent_portal.homework.title")}</h1>
        <p className="text-neutral-400 text-sm">{t("parent_portal.homework.subtitle")}</p>
      </header>

      {/* Filter Tabs */}
      <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
        <button
          onClick={() => setActiveTab("active")}
          className={clsx(
            "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
            activeTab === "active"
              ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          )}
        >
          <ClipboardList className="w-4 h-4" />
          {t("parent_portal.homework.active")}
          {activeItems.length > 0 && (
            <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-bold px-1.5 py-0.5 rounded-full">
              {activeItems.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={clsx(
            "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2",
            activeTab === "completed"
              ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
              : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          {t("parent_portal.homework.completed_tab")}
        </button>
      </div>

      {/* Homework List */}
      {displayItems.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="w-14 h-14 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-neutral-300 dark:text-neutral-600" />
          </div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">
            {activeTab === "active"
              ? t("parent_portal.homework.no_active")
              : t("parent_portal.homework.no_completed")}
          </h3>
          <p className="text-neutral-400 text-sm mt-1">
            {activeTab === "active"
              ? t("parent_portal.homework.no_active_subtitle")
              : t("parent_portal.homework.no_completed_subtitle")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const isUpdating = updatingId === item.id;

            return (
              <div
                key={item.id}
                className={clsx(
                  "bg-white dark:bg-neutral-900 rounded-2xl border shadow-sm overflow-hidden transition-all",
                  item.completed
                    ? "border-success-200 dark:border-success-900/30"
                    : "border-neutral-200 dark:border-neutral-800"
                )}
              >
                {/* Main Row */}
                <div className="p-4 flex items-start gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggleComplete(item)}
                    disabled={isUpdating}
                    className={clsx(
                      "mt-0.5 flex-shrink-0 transition-all",
                      isUpdating && "opacity-50"
                    )}
                  >
                    {item.completed ? (
                      <CheckCircle2 className="w-6 h-6 text-success-500" />
                    ) : (
                      <Circle className="w-6 h-6 text-neutral-300 dark:text-neutral-600 hover:text-primary-500 transition-colors" />
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h4
                      className={clsx(
                        "text-sm font-semibold",
                        item.completed
                          ? "text-neutral-400 line-through"
                          : "text-neutral-900 dark:text-white"
                      )}
                    >
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                        {getTherapistName(item.assignedBy)}
                      </span>
                      {item.frequency && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                          {frequencyLabel(item.frequency)}
                        </span>
                      )}
                      {item.dueDate && !item.completed && (
                        <span
                          className={clsx(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1",
                            new Date(item.dueDate) < new Date()
                              ? "bg-error-50 dark:bg-error-900/20 text-error-600 dark:text-error-400"
                              : "bg-neutral-50 dark:bg-neutral-800 text-neutral-500"
                          )}
                        >
                          <Clock className="w-3 h-3" />
                          {new Date(item.dueDate).toLocaleDateString(currentLang)}
                        </span>
                      )}
                      {item.completed && item.completedAt && (
                        <span className="text-[10px] text-success-600 dark:text-success-400 font-medium">
                          {t("parent_portal.homework.completed_on")} {new Date(item.completedAt).toLocaleDateString(currentLang)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expand toggle */}
                <div className="border-t border-neutral-100 dark:border-neutral-800">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className="w-full px-4 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <StickyNote className="w-3.5 h-3.5" />
                    {t("parent_portal.homework.notes")}
                  </button>
                </div>

                {/* Expanded notes section */}
                {isExpanded && (
                  <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                    <textarea
                      value={notes[item.id] !== undefined ? notes[item.id] : item.parentNotes || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                      placeholder={t("parent_portal.homework.notes_placeholder")}
                      rows={3}
                      className="w-full bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-200 dark:border-neutral-700 px-3 py-2.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    {notes[item.id] !== undefined && notes[item.id] !== (item.parentNotes || "") && (
                      <button
                        onClick={() => handleSaveNotes(item)}
                        disabled={isUpdating}
                        className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-50"
                      >
                        {isUpdating ? t("parent_portal.homework.saving") : t("parent_portal.homework.save_notes")}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
