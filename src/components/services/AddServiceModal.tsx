"use client";

import { useState } from "react";
import { X, Loader2, Briefcase } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";

interface AddServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddServiceModal({ isOpen, onClose }: AddServiceModalProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    id: "",
    label: "",
    isBillable: true,
    basePrice: "",
    requiresTime: true,
  });

  // Generate ID from label
  const generateId = (label: string) => {
    return label
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .trim();
  };

  const handleLabelChange = (label: string) => {
    setFormData({
      ...formData,
      label,
      id: generateId(label),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.id || !formData.label) {
      error(t('services.add_modal.validation_error'));
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        id: formData.id,
        label: formData.label,
        isBillable: formData.isBillable,
        basePrice: formData.isBillable ? parseFloat(formData.basePrice) || 0 : 0,
        requiresTime: formData.requiresTime,
      };

      await setDoc(doc(db, "services", formData.id), payload);
      success(t('services.add_modal.success'));
      setFormData({
        id: "",
        label: "",
        isBillable: true,
        basePrice: "",
        requiresTime: true,
      });
      onClose();
    } catch (err) {
      console.error(err);
      error(t('services.add_modal.error'));
    } finally {
      setIsSubmitting(false);
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
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                {t('services.add_modal.title')}
              </h2>
              <p className="text-xs text-neutral-500">
                {t('services.add_modal.subtitle')}
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
          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              {t('services.add_modal.service_name')} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t('services.add_modal.service_name_placeholder')}
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.label}
              onChange={(e) => handleLabelChange(e.target.value)}
            />
          </div>

          {/* Service ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              {t('services.add_modal.service_id')} <span className="text-error-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={t('services.add_modal.service_id_placeholder')}
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 font-mono text-sm"
              value={formData.id}
              onChange={(e) => setFormData({ ...formData, id: e.target.value })}
            />
            <p className="text-xs text-neutral-500 mt-1">
              {t('services.add_modal.id_hint')}
            </p>
          </div>

          {/* Billable Toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                {t('services.billable_service')}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t('services.billable_description')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, isBillable: !formData.isBillable })
              }
              className={`relative w-12 h-7 rounded-full transition-colors ${
                formData.isBillable
                  ? "bg-primary-500"
                  : "bg-neutral-300 dark:bg-neutral-600"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.isBillable ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Base Price (only if billable) */}
          {formData.isBillable && (
            <div className="animate-in slide-in-from-top-2">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                {t('services.base_price_ron')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.basePrice}
                onChange={(e) =>
                  setFormData({ ...formData, basePrice: e.target.value })
                }
              />
            </div>
          )}

          {/* Requires Time Toggle */}
          <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                {t('services.requires_time')}
              </p>
              <p className="text-xs text-neutral-500 mt-0.5">
                {t('services.requires_time_description')}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({ ...formData, requiresTime: !formData.requiresTime })
              }
              className={`relative w-12 h-7 rounded-full transition-colors ${
                formData.requiresTime
                  ? "bg-primary-500"
                  : "bg-neutral-300 dark:bg-neutral-600"
              }`}
            >
              <div
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  formData.requiresTime ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold transition-colors"
            >
              {t('services.add_modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                t('services.add_modal.submit')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
