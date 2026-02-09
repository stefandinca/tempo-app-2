"use client";

import React, { useEffect } from "react";
import { X, AlertTriangle, Info, Trash2, HelpCircle } from "lucide-react";
import { clsx } from "clsx";

export type ConfirmVariant = "danger" | "warning" | "info" | "primary";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
}: ConfirmationModalProps) {
  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const icons = {
    danger: <Trash2 className="w-6 h-6 text-error-600" />,
    warning: <AlertTriangle className="w-6 h-6 text-warning-600" />,
    info: <Info className="w-6 h-6 text-blue-600" />,
    primary: <HelpCircle className="w-6 h-6 text-primary-600" />,
  };

  const buttonClasses = {
    danger: "bg-error-600 hover:bg-error-700 text-white shadow-error-600/20",
    warning: "bg-warning-600 hover:bg-warning-700 text-white shadow-warning-600/20",
    info: "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20",
    primary: "bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20",
  };

  const iconBgClasses = {
    danger: "bg-error-50 dark:bg-error-900/20",
    warning: "bg-warning-50 dark:bg-warning-900/20",
    info: "bg-blue-50 dark:bg-blue-900/20",
    primary: "bg-primary-50 dark:bg-primary-900/20",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0", iconBgClasses[variant])}>
              {icons[variant]}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
                {title}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                {message}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-8 flex items-center gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={clsx(
                "px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg",
                buttonClasses[variant]
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
