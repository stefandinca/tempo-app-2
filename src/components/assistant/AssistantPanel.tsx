"use client";

import { useEffect, useRef, useState } from "react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { openChatStream, AssistantError } from "@/lib/assistant/clientApi";
import { useAiConsent } from "@/hooks/useAiConsent";
import AiConsentModal from "./AiConsentModal";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

export default function AssistantPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("ro") ? "ro" : "en";
  const { consented } = useAiConsent();
  const [consentOpen, setConsentOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!consented) {
      setConsentOpen(true);
      return;
    }
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);
    try {
      const res = await openChatStream({ messages: history, language: lang });
      if (!res.ok || !res.body) throw new AssistantError("failed", res.status);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: acc };
          return c;
        });
      }
    } catch (err) {
      const status = err instanceof AssistantError ? err.status : 0;
      const msg =
        status === 403
          ? t("assistant.chat.consent_needed", { defaultValue: "AI consent is required." })
          : status === 429
          ? t("assistant.chat.rate_limited", { defaultValue: "Daily AI limit reached." })
          : t("assistant.chat.error", { defaultValue: "Sorry, something went wrong." });
      setMessages((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: msg };
        return c;
      });
    } finally {
      setStreaming(false);
    }
  };

  if (!isOpen) return null;

  const suggestions =
    lang === "ro"
      ? ["Cum creez o evaluare VB-MAPP?", "Cum generez o factură pentru un client?"]
      : ["How do I create a VB-MAPP evaluation?", "How do I generate a client invoice?"];

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-md h-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-600" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white text-sm">
                {t("assistant.chat.title", { defaultValue: "TempoApp assistant" })}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {t("assistant.chat.subtitle", { defaultValue: "Guidance & clinical support" })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 min-w-11 min-h-11 flex items-center justify-center">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 mx-auto mb-3 text-primary-300" />
              <p className="text-sm text-neutral-500 mb-4">
                {t("assistant.chat.empty", { defaultValue: "Ask about using TempoApp or a child's evaluation results." })}
              </p>
              <div className="space-y-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="block w-full text-left text-sm px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={clsx(
                    "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed",
                    m.role === "user"
                      ? "bg-primary-600 text-white rounded-br-md"
                      : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md"
                  )}
                >
                  {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="w-4 h-4 animate-spin" /> : "")}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder={t("assistant.chat.placeholder", { defaultValue: "Ask a question…" })}
              className="flex-1 resize-none max-h-32 px-3 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={send}
              disabled={streaming || !input.trim()}
              className="w-11 h-11 shrink-0 rounded-xl bg-primary-600 hover:bg-primary-700 text-white flex items-center justify-center transition-colors disabled:opacity-50"
            >
              {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[10px] text-neutral-400 mt-1.5 text-center">
            {t("assistant.chat.disclaimer", { defaultValue: "AI can be wrong. Verify clinical guidance." })}
          </p>
        </div>
      </div>

      <AiConsentModal isOpen={consentOpen} onClose={() => setConsentOpen(false)} onGranted={() => { setConsentOpen(false); send(); }} />
    </div>
  );
}
