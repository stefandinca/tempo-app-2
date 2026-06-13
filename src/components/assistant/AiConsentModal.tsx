"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ShieldCheck, X } from "lucide-react";
import { useAiConsent } from "@/hooks/useAiConsent";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onGranted: () => void;
}

export default function AiConsentModal({ isOpen, onClose, onGranted }: Props) {
  const { t } = useTranslation();
  const { grant } = useAiConsent();
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const accept = async () => {
    setSaving(true);
    try {
      await grant();
      onGranted();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">
              {t("assistant.consent.title", { defaultValue: "Enable AI assistance" })}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 min-w-11 min-h-11 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
          <p>
            {t("assistant.consent.body", {
              defaultValue:
                "AI features send de-identified clinical data (initials, age, evaluation scores — never names, birth dates, or contact details) to Anthropic's Claude to generate insights and answer questions.",
            })}
          </p>
          <p className="text-xs">
            {t("assistant.consent.privacy", {
              defaultValue: "No data is sent without this consent. You can ask your administrator to disable AI features at any time.",
            })}
          </p>
        </div>
        <div className="flex gap-2 p-5 border-t border-neutral-200 dark:border-neutral-800">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 font-semibold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
          >
            {t("assistant.consent.cancel", { defaultValue: "Not now" })}
          </button>
          <button
            onClick={accept}
            disabled={saving}
            className="flex-[2] py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors disabled:opacity-70"
          >
            {t("assistant.consent.accept", { defaultValue: "I consent" })}
          </button>
        </div>
      </div>
    </div>
  );
}
