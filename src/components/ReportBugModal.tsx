"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bug, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { auth } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

/**
 * Lets clinic staff report a problem straight to us.
 *
 * The report is stored centrally and emailed — see
 * `src/app/api/report-bug/route.ts`. The current path is captured
 * automatically, because "it's broken" without a page is a support round-trip
 * we would otherwise always have to make.
 */
export default function ReportBugModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Escape closes, as everywhere else in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open || !mounted) return null;

  const submit = async () => {
    if (!title.trim() || !description.trim() || busy) return;
    setBusy(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("not signed in");

      const res = await fetch("/api/report-bug/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await user.getIdToken()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          page: typeof window !== "undefined" ? window.location.pathname : "",
        }),
      });
      if (!res.ok) throw new Error(`report failed (${res.status})`);

      success(t("report_bug.sent"));
      setTitle("");
      setDescription("");
      onClose();
    } catch (err) {
      console.error(err);
      error(t("report_bug.send_error"));
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-neutral-900/50 backdrop-blur-sm"
        onClick={() => !busy && onClose()}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("report_bug.title")}
        className="relative w-full sm:max-w-lg bg-white dark:bg-neutral-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 animate-in fade-in slide-in-from-bottom-4 duration-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start gap-3 p-6 pb-4">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center shrink-0">
            <Bug className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {t("report_bug.title")}
            </h2>
            <p className="text-sm text-neutral-500">{t("report_bug.subtitle")}</p>
          </div>
          <button
            onClick={() => !busy && onClose()}
            aria-label={t("common.close")}
            className="w-11 h-11 -mt-2 -mr-2 rounded-xl inline-flex items-center justify-center text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          <div>
            <label htmlFor="bug-title" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t("report_bug.what")}
            </label>
            <input
              id="bug-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={t("report_bug.what_placeholder")}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="bug-description" className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              {t("report_bug.details")}
            </label>
            <textarea
              id="bug-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              maxLength={5000}
              placeholder={t("report_bug.details_placeholder")}
              className="w-full px-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-sm resize-y focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <p className="text-xs text-neutral-500">{t("report_bug.privacy")}</p>

          <div className="flex items-center gap-2 justify-end pt-2">
            <button
              onClick={() => !busy && onClose()}
              disabled={busy}
              className="min-h-[44px] px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              onClick={submit}
              disabled={busy || !title.trim() || !description.trim()}
              className="min-h-[44px] px-5 rounded-xl bg-primary-500 text-white font-semibold text-sm hover:bg-primary-600 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {t("report_bug.send")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
