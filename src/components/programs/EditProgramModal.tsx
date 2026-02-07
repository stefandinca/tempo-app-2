"use client";

import { useState, useEffect } from "react";
import { X, Loader2, BookOpen } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { Program } from "./ProgramCard";
import { useTranslation } from "react-i18next";

interface EditProgramModalProps {
  isOpen: boolean;
  program: Program | null;
  onClose: () => void;
}

export default function EditProgramModal({
  isOpen,
  program,
  onClose,
}: EditProgramModalProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  // Populate form when program changes
  useEffect(() => {
    if (program) {
      setFormData({
        title: program.title,
        description: program.description || "",
      });
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!program || !formData.title) {
      error(t('programs.edit_modal.validation_error'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: Record<string, string> = {
        title: formData.title,
      };
      if (formData.description.trim()) {
        payload.description = formData.description.trim();
      } else {
        payload.description = "";
      }

      await updateDoc(doc(db, "programs", program.id), payload);
      success(t('programs.edit_modal.success'));
      onClose();
    } catch (err) {
      console.error(err);
      error(t('programs.edit_modal.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !program) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {t('programs.edit_modal.title')}
              </h2>
              <p className="text-xs text-neutral-500 font-mono">{program.id}</p>
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
          {/* Program Title */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              {t('programs.edit_modal.program_title')} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t('programs.edit_modal.title_placeholder')}
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              {t('programs.edit_modal.description')}
            </label>
            <textarea
              rows={3}
              placeholder={t('programs.edit_modal.description_placeholder')}
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold transition-colors"
            >
              {t('programs.edit_modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('programs.edit_modal.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
