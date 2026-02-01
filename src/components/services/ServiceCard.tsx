"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit, Trash2, Clock, DollarSign, CheckCircle, XCircle } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";

export interface Service {
  id: string;
  label: string;
  isBillable: boolean;
  basePrice: number;
  requiresTime: boolean;
}

interface ServiceCardProps {
  service: Service;
  onEdit: () => void;
}

export default function ServiceCard({ service, onEdit }: ServiceCardProps) {
  const { success, error } = useToast();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${service.label}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await deleteDoc(doc(db, "services", service.id));
      success("Service deleted");
    } catch (err) {
      error("Failed to delete service");
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={clsx(
              "w-12 h-12 rounded-xl flex items-center justify-center",
              service.isBillable
                ? "bg-success-100 dark:bg-success-900/30 text-success-600 dark:text-success-400"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
            )}
          >
            {service.isBillable ? (
              <DollarSign className="w-6 h-6" />
            ) : (
              <Clock className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white leading-tight">
              {service.label}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">ID: {service.id}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  onEdit();
                  setIsMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="space-y-3">
        {/* Billable Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Status</span>
          <div
            className={clsx(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
              service.isBillable
                ? "bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
            )}
          >
            {service.isBillable ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Billable
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5" />
                Non-Billable
              </>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Base Price</span>
          <span
            className={clsx(
              "text-lg font-bold",
              service.isBillable && service.basePrice > 0
                ? "text-neutral-900 dark:text-white"
                : "text-neutral-400"
            )}
          >
            {service.isBillable && service.basePrice > 0
              ? `${service.basePrice} RON`
              : "—"}
          </span>
        </div>

        {/* Requires Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Requires Time Slot</span>
          <span
            className={clsx(
              "text-sm font-medium",
              service.requiresTime
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-400"
            )}
          >
            {service.requiresTime ? "Yes" : "No"}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <button
          onClick={onEdit}
          className="w-full text-center py-2 px-3 text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl hover:bg-primary-500 hover:text-white dark:hover:bg-primary-600 transition-all"
        >
          Edit Service
        </button>
      </div>
    </div>
  );
}
