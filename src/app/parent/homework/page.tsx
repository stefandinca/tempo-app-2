"use client";

import { useState, useMemo } from "react";
import { ClipboardList, CheckCircle2, Circle, Clock, StickyNote, ChevronDown, ChevronUp, BookOpen, Loader2 } from "lucide-react";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const loading = portalLoading || homeworkLoading;

  const activeItems = useMemo(() => homework.filter((h) => !h.completed), [homework]);
  const completedItems = useMemo(() => homework.filter((h) => h.completed), [homework]);

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

  const renderHomeworkItem = (item: any) => {
    const isExpanded = expandedId === item.id;
    const isUpdating = updatingId === item.id;

    return (
      <div
        key={item.id}
        className={clsx(
          "bg-white dark:bg-neutral-900 rounded-2xl border shadow-sm overflow-hidden transition-all",
          item.completed
            ? "border-success-100 dark:border-success-900/20 opacity-80"
            : "border-neutral-200 dark:border-neutral-800"
        )}
      >
        {/* Main Row */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            {/* Content */}
            <div className="flex-1 min-w-0" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
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
                <p className={clsx(
                  "text-xs mt-0.5 whitespace-pre-wrap",
                  item.completed ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400",
                  !isExpanded && "line-clamp-2"
                )}>
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
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex gap-2">
            <button
              onClick={() => handleToggleComplete(item)}
              disabled={isUpdating}
              className={clsx(
                "flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2",
                item.completed
                  ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                  : "bg-success-50 dark:bg-success-900/20 text-success-700 dark:text-success-400 hover:bg-success-100 dark:hover:bg-success-900/30 border border-success-100 dark:border-success-900/30",
                isUpdating && "opacity-50 cursor-wait"
              )}
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : item.completed ? (
                <>
                  <Clock className="w-4 h-4" />
                  {t("parent_portal.homework.mark_in_progress")}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t("parent_portal.homework.mark_complete")}
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expand toggle */}
        <div className="border-t border-neutral-100 dark:border-neutral-800">
          <button
            onClick={() => setExpandedId(isExpanded ? null : item.id)}
            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5" />
              {t("parent_portal.homework.notes")}
              {(item.parentNotes || notes[item.id]) && <span className="w-1 h-1 rounded-full bg-primary-500" />}
            </div>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                className="mt-2 w-full py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-primary-600/20"
              >
                {isUpdating ? t("parent_portal.homework.saving") : t("parent_portal.homework.save_notes")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 space-y-8 animate-in fade-in duration-300 pb-24 max-w-2xl mx-auto">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t("parent_portal.homework.title")}</h1>
        <p className="text-neutral-500 text-sm mt-1">{t("parent_portal.homework.subtitle")}</p>
      </header>

      {/* Active Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
            <ClipboardList className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-neutral-900 dark:text-white">{t("parent_portal.homework.active")}</h2>
          <span className="ml-auto text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
            {activeItems.length}
          </span>
        </div>

        {activeItems.length === 0 ? (
          <div className="py-12 text-center bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
            <p className="text-neutral-400 text-sm">{t("parent_portal.homework.no_active")}</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {activeItems.map(renderHomeworkItem)}
          </div>
        )}
      </section>

      {/* Completed Section */}
      {completedItems.length > 0 && (
        <section className="space-y-4 pt-4">
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-lg bg-success-100 dark:bg-success-900/30 flex items-center justify-center text-success-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-neutral-900 dark:text-white">{t("parent_portal.homework.completed_tab")}</h2>
            <span className="ml-auto text-xs font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 px-2 py-0.5 rounded-full">
              {completedItems.length}
            </span>
          </div>

          <div className="grid gap-3">
            {completedItems.map(renderHomeworkItem)}
          </div>
        </section>
      )}
    </div>
  );
}
