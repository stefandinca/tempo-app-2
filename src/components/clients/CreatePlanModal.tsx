"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Target, Search, Check, BookOpen, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { usePrograms, InterventionPlan } from "@/hooks/useCollections";
import { useTranslation } from "react-i18next";

interface CreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  existingPlan?: InterventionPlan | null;
}

export default function CreatePlanModal({
  isOpen,
  onClose,
  clientId,
  existingPlan
}: CreatePlanModalProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { data: programs, loading: programsLoading } = usePrograms();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [search, setSearch] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    startDate: "",
    endDate: "",
    programIds: [] as string[],
    status: "active" as "active" | "draft" | "completed"
  });

  // Initialize form with existing plan data or defaults
  useEffect(() => {
    if (existingPlan) {
      setFormData({
        name: existingPlan.name,
        startDate: existingPlan.startDate,
        endDate: existingPlan.endDate,
        programIds: existingPlan.programIds,
        status: existingPlan.status
      });
    } else {
      // Default to today and 3 months from now
      const today = new Date();
      const threeMonthsLater = new Date();
      threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

      setFormData({
        name: "",
        startDate: today.toISOString().split("T")[0],
        endDate: threeMonthsLater.toISOString().split("T")[0],
        programIds: [],
        status: "active"
      });
    }
    setSearch("");
  }, [existingPlan, isOpen, clientId]);

  const filteredPrograms = (programs || []).filter(prog =>
    prog.title.toLowerCase().includes(search.toLowerCase()) ||
    (prog.description || "").toLowerCase().includes(search.toLowerCase())
  );

  const toggleProgram = (id: string) => {
    setFormData(prev => ({
      ...prev,
      programIds: prev.programIds.includes(id)
        ? prev.programIds.filter(p => p !== id)
        : [...prev.programIds, id]
    }));
  };

  const statusLabels: Record<string, string> = {
    active: t('clients.plan_modal.status_active'),
    draft: t('clients.plan_modal.status_draft'),
    completed: t('clients.plan_modal.status_completed')
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) return t('clients.plan_modal.validation.name_required');
    if (!formData.startDate) return t('clients.plan_modal.validation.start_date_required');
    if (!formData.endDate) return t('clients.plan_modal.validation.end_date_required');
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      return t('clients.plan_modal.validation.end_after_start');
    }
    if (formData.programIds.length === 0) return t('clients.plan_modal.validation.select_program');
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      error(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        clientId: clientId, // Denormalize clientId for collectionGroup security rules
        name: formData.name.trim(),
        startDate: formData.startDate,
        endDate: formData.endDate,
        programIds: formData.programIds,
        status: formData.status,
        ...(existingPlan ? {} : { createdAt: new Date().toISOString() })
      };

      if (existingPlan) {
        // Update existing plan
        const planRef = doc(db, "clients", clientId, "interventionPlans", existingPlan.id);
        await updateDoc(planRef, payload);
        success(t('clients.plan_modal.success_edit'));
      } else {
        // Create new plan
        await addDoc(collection(db, "clients", clientId, "interventionPlans"), payload);
        success(t('clients.plan_modal.success_create'));
      }

      onClose();
    } catch (err) {
      console.error(err);
      error(existingPlan ? t('clients.plan_modal.error_edit') : t('clients.plan_modal.error_create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingPlan) return;
    if (!confirm(t('clients.plan_modal.delete_confirm', { name: existingPlan.name }))) return;

    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "clients", clientId, "interventionPlans", existingPlan.id));
      success(t('clients.plan_modal.deleted'));
      onClose();
    } catch (err) {
      console.error(err);
      error(t('clients.plan_modal.delete_error'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {existingPlan ? t('clients.plan_modal.title_edit') : t('clients.plan_modal.title_create')}
              </h2>
              <p className="text-xs text-neutral-500">
                {existingPlan ? t('clients.plan_modal.subtitle_edit') : t('clients.plan_modal.subtitle_create')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Plan Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              {t('clients.plan_modal.plan_name')} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t('clients.plan_modal.plan_name_placeholder')}
              className="w-full px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                {t('clients.plan_modal.start_date')} <span className="text-error-500">*</span>
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                {t('clients.plan_modal.end_date')} <span className="text-error-500">*</span>
              </label>
              <input
                type="date"
                required
                className="w-full px-3 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          {/* Status (only show for existing plans) */}
          {existingPlan && (
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                {t('clients.plan_modal.status')}
              </label>
              <div className="flex gap-2">
                {(["active", "draft", "completed"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setFormData({ ...formData, status })}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-sm font-medium transition-all border",
                      formData.status === status
                        ? status === "active"
                          ? "bg-success-500 border-success-600 text-white"
                          : status === "draft"
                          ? "bg-warning-500 border-warning-600 text-white"
                          : "bg-neutral-500 border-neutral-600 text-white"
                        : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400"
                    )}
                  >
                    {statusLabels[status]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Programs Selection */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              {t('clients.plan_modal.select_programs')} <span className="text-error-500">*</span>
              <span className="ml-2 text-xs text-neutral-500 font-normal">
                {t('clients.plan_modal.selected_count', { count: formData.programIds.length })}
              </span>
            </label>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input
                type="text"
                placeholder={t('clients.plan_modal.search_programs')}
                className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Program List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {programsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
                </div>
              ) : filteredPrograms.length === 0 ? (
                <p className="text-center py-4 text-sm text-neutral-500">
                  {t('clients.plan_modal.no_programs')}
                </p>
              ) : (
                filteredPrograms.map((prog) => {
                  const isSelected = formData.programIds.includes(prog.id);
                  return (
                    <div
                      key={prog.id}
                      onClick={() => toggleProgram(prog.id)}
                      className={clsx(
                        "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all",
                        isSelected
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-neutral-200 dark:border-neutral-700 hover:border-primary-300"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded border flex items-center justify-center flex-shrink-0",
                        isSelected
                          ? "bg-primary-500 border-primary-500 text-white"
                          : "border-neutral-300 dark:border-neutral-600"
                      )}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate flex items-center gap-1.5">
                          <BookOpen className="w-3 h-3 text-neutral-400 flex-shrink-0" />
                          {prog.title}
                        </p>
                        {prog.description && (
                          <p className="text-xs text-neutral-500 truncate">{prog.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4">
            {existingPlan && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2.5 border border-error-200 dark:border-error-800 text-error-600 rounded-xl hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Trash2 className="w-5 h-5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold transition-colors"
            >
              {t('clients.plan_modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : existingPlan ? (
                t('clients.plan_modal.submit_edit')
              ) : (
                t('clients.plan_modal.submit_create')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
