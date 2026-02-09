"use client";

import { useState, useRef, useEffect } from "react";
import { MoreVertical, Edit, Trash2, BookOpen } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";

export interface Program {
  id: string;
  title: string;
  description?: string;
}

interface ProgramCardProps {
  program: Program;
  onEdit: () => void;
}

export default function ProgramCard({ program, onEdit }: ProgramCardProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();
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
    customConfirm({
      title: t('common.delete'),
      message: t('programs.delete_confirm', { name: program.title }),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "programs", program.id));
          success(t('programs.deleted'));
        } catch (err) {
          error(t('programs.delete_error'));
        }
      }
    });
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 hover:shadow-md transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-neutral-900 dark:text-white leading-tight">
              {program.title}
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">ID: {program.id}</p>
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
                {t('common.edit')}
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                {t('common.delete')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        {program.description && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
            {program.description}
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <button
          onClick={onEdit}
          className="w-full text-center py-2 px-3 text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 rounded-xl hover:bg-primary-500 hover:text-white dark:hover:bg-primary-600 transition-all"
        >
          {t('programs.edit_program')}
        </button>
      </div>
    </div>
  );
}
