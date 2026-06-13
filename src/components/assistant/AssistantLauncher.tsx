"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import AssistantPanel from "./AssistantPanel";

/** Floating AI-assistant button + panel. Mounted in the staff shell only. */
export default function AssistantLauncher() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("assistant.chat.open", { defaultValue: "Open AI assistant" })}
        className="fixed bottom-20 lg:bottom-6 right-4 lg:right-6 z-40 w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-600/30 flex items-center justify-center transition-all hover:scale-105"
      >
        <Sparkles className="w-5 h-5" />
      </button>
      <AssistantPanel isOpen={open} onClose={() => setOpen(false)} />
    </>
  );
}
