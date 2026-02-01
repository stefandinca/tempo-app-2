"use client";

import { useEffect } from "react";
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { clsx } from "clsx";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles = {
  success: "bg-success-500 border-success-600 text-white",
  error: "bg-error-500 border-error-600 text-white",
  warning: "bg-warning-500 border-warning-600 text-white",
  info: "bg-primary-500 border-primary-600 text-white",
};

export default function Toast({ id, message, type, duration = 5000, onDismiss }: ToastProps) {
  const Icon = icons[type];

  useEffect(() => {
    console.log("Toast mounted:", id);
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, onDismiss]);

  return (
    <div
      className={clsx(
        "flex items-start gap-3 p-4 rounded-lg shadow-lg border w-80 pointer-events-auto z-[9999]",
        styles[type]
      )}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button 
        onClick={() => onDismiss(id)} 
        className="text-white/80 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
