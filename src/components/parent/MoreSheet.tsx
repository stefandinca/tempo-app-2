"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  CreditCard,
  FileText,
  User,
  BookOpen,
  LogOut,
  X,
  ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface MoreSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
  unpaidCount?: number;
  incompleteHomeworkCount?: number;
}

export default function MoreSheet({ 
  isOpen, 
  onClose, 
  onSignOut, 
  unpaidCount = 0,
  incompleteHomeworkCount = 0
}: MoreSheetProps) {
  const { t } = useTranslation();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const menuItems = [
    { href: "/parent/billing/", icon: CreditCard, label: t("parent_nav.billing"), badge: unpaidCount > 0 ? unpaidCount : undefined, variant: 'error' },
    { href: "/parent/docs/", icon: FileText, label: t("parent_nav.docs") },
    { href: "/parent/profile/", icon: User, label: t("parent_nav.profile") },
    { href: "/parent/homework/", icon: BookOpen, label: t("parent_nav.homework"), badge: incompleteHomeworkCount > 0 ? incompleteHomeworkCount : undefined, variant: 'primary' },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={clsx(
          "fixed inset-0 bg-black/40 z-[80] transition-opacity duration-300 backdrop-blur-sm",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={clsx(
          "fixed bottom-0 left-0 right-0 z-[90] bg-white dark:bg-neutral-900 rounded-t-3xl shadow-2xl transform transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full"
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-neutral-300 dark:bg-neutral-700 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pb-3 pt-1">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t("parent_nav.more")}
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="px-3 pb-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
            >
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-600 dark:text-neutral-300 group-hover:bg-primary-50 group-hover:text-primary-600 dark:group-hover:bg-primary-900/20 dark:group-hover:text-primary-400 transition-colors">
                <item.icon className="w-5 h-5" />
              </div>
              <span className="flex-1 font-medium text-neutral-900 dark:text-white">
                {item.label}
              </span>
              {item.badge && (
                <span className={clsx(
                  "px-2 py-0.5 text-[10px] font-bold rounded-full",
                  item.variant === 'error' 
                    ? "bg-error-500 text-white shadow-sm"
                    : "bg-primary-500 text-white shadow-sm"
                )}>
                  {item.badge}
                </span>
              )}
              <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600" />
            </Link>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-5 border-t border-neutral-100 dark:border-neutral-800" />

        {/* Sign Out */}
        <div className="px-3 pt-2 pb-8">
          <button
            onClick={() => { onSignOut(); onClose(); }}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl hover:bg-error-50 dark:hover:bg-error-900/10 transition-colors w-full group"
          >
            <div className="w-10 h-10 bg-error-50 dark:bg-error-900/20 rounded-xl flex items-center justify-center text-error-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="font-medium text-error-600 dark:text-error-400">
              {t("parent_nav.sign_out")}
            </span>
          </button>
        </div>
      </div>
    </>
  );
}
