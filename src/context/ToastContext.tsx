"use client";

import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import Toast, { ToastType, ToastProps } from "@/components/ui/Toast";

interface ToastContextType {
  showToast: (message: string, type: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration = 5000) => {
    console.log("Showing toast:", message, type);
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, duration, onDismiss: removeToast }]);
  }, [removeToast]);

  const success = useCallback((msg: string, duration?: number) => showToast(msg, "success", duration), [showToast]);
  const error = useCallback((msg: string, duration?: number) => showToast(msg, "error", duration), [showToast]);
  const warning = useCallback((msg: string, duration?: number) => showToast(msg, "warning", duration), [showToast]);
  const info = useCallback((msg: string, duration?: number) => showToast(msg, "info", duration), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Container - High Z-Index, Fixed Position */}
      <div 
        className="fixed top-0 right-0 p-4 z-[10000] flex flex-col gap-2 max-h-screen pointer-events-none"
        style={{ marginTop: '4rem' }} // Push down by 64px (header height)
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto animate-in slide-in-from-right-5 fade-in duration-300">
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}