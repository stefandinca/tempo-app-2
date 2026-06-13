"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Sparkles, X, Send, Loader2, Plus, History, ChevronLeft } from "lucide-react";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db, auth, IS_DEMO } from "@/lib/firebase";
import { openChatStream, AssistantError } from "@/lib/assistant/clientApi";
import { useAiConsent } from "@/hooks/useAiConsent";
import AiConsentModal from "./AiConsentModal";

// Lazy so react-markdown only loads when the chat is actually opened.
const MarkdownMessage = dynamic(() => import("./MarkdownMessage"), { ssr: false });

interface Msg {
  id?: string;
  role: "user" | "assistant";
  content: string;
}
interface ConvSummary {
  id: string;
  title?: string;
  lastMessageAt?: { toDate: () => Date } | null;
}

const LS_KEY = "mira_conversation_id";

export default function AssistantPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("ro") ? "ro" : "en";
  const { consented } = useAiConsent();
  const [consentOpen, setConsentOpen] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dbMessages, setDbMessages] = useState<Msg[]>([]);
  const [conversations, setConversations] = useState<ConvSummary[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const [demoMessages, setDemoMessages] = useState<Msg[]>([]); // demo-only local thread
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [streamingText, setStreamingText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const uid = auth.currentUser?.uid;

  // Restore the last conversation id on first mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LS_KEY);
    if (saved) setConversationId(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !conversationId) return;
    window.localStorage.setItem(LS_KEY, conversationId);
  }, [conversationId]);

  // The user's conversation list (history).
  useEffect(() => {
    if (!uid || IS_DEMO) return;
    const qy = query(
      collection(db, "ai_conversations"),
      where("uid", "==", uid),
      orderBy("lastMessageAt", "desc"),
      limit(30),
    );
    return onSnapshot(
      qy,
      (snap) => setConversations(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))),
      () => {},
    );
  }, [uid]);

  // Messages of the current conversation.
  useEffect(() => {
    if (!conversationId || IS_DEMO) {
      setDbMessages([]);
      return;
    }
    const qy = query(collection(db, "ai_conversations", conversationId, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(
      qy,
      (snap) => setDbMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Msg))),
      () => {},
    );
  }, [conversationId]);

  // Reconcile optimistic bubbles with the server-persisted snapshot.
  useEffect(() => {
    if (!dbMessages.length) return;
    const last = dbMessages[dbMessages.length - 1];
    if (last.role === "assistant") {
      setPendingUser(null);
      if (!streaming) setStreamingText("");
    } else if (last.role === "user" && pendingUser && last.content === pendingUser) {
      setPendingUser(null); // user message is now visible from Firestore
    }
  }, [dbMessages, streaming, pendingUser]);

  const rendered: Msg[] = IS_DEMO
    ? demoMessages
    : [
        ...dbMessages,
        ...(pendingUser ? [{ role: "user" as const, content: pendingUser }] : []),
        ...(streaming || streamingText ? [{ role: "assistant" as const, content: streamingText }] : []),
      ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [rendered.length, streamingText]);

  const newChat = () => {
    setConversationId(null);
    setDbMessages([]);
    setDemoMessages([]);
    setPendingUser(null);
    setStreamingText("");
    setShowHistory(false);
    if (typeof window !== "undefined") window.localStorage.removeItem(LS_KEY);
  };

  const openConversation = (id: string) => {
    setConversationId(id);
    setShowHistory(false);
    setPendingUser(null);
    setStreamingText("");
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    // Demo build ships without an API key — show the upsell instead of calling out.
    if (IS_DEMO) {
      setDemoMessages((m) => [
        ...m,
        { role: "user", content: text },
        { role: "assistant", content: t("assistant.unavailable", { defaultValue: "This feature is only available in the full release." }) },
      ]);
      setInput("");
      return;
    }
    if (!consented) {
      setConsentOpen(true);
      return;
    }

    setPendingUser(text);
    setStreamingText("");
    setStreaming(true);
    setInput("");
    try {
      const res = await openChatStream({ conversationId, message: text, language: lang });
      if (res.status === 503) throw new AssistantError("ai_unavailable", 503);
      if (!res.ok || !res.body) throw new AssistantError("failed", res.status);
      const newId = res.headers.get("X-Conversation-Id");
      if (newId && newId !== conversationId) setConversationId(newId);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setStreamingText(acc);
      }
    } catch (err) {
      const status = err instanceof AssistantError ? err.status : 0;
      const msg =
        status === 503
          ? t("assistant.unavailable", { defaultValue: "This feature is only available in the full release." })
          : status === 403
          ? t("assistant.chat.consent_needed", { defaultValue: "AI consent is required." })
          : status === 429
          ? t("assistant.chat.rate_limited", { defaultValue: "Daily AI limit reached." })
          : t("assistant.chat.error", { defaultValue: "Sorry, something went wrong." });
      setStreamingText(msg);
    } finally {
      setStreaming(false);
    }
  };

  if (!isOpen) return null;

  const suggestions =
    lang === "ro"
      ? ["Rezumă progresul unui copil (scrie numele)", "Cum creez o evaluare VB-MAPP?"]
      : ["Summarize a child's progress (type their name)", "How do I create a VB-MAPP evaluation?"];

  const iconBtn =
    "p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 min-w-11 min-h-11 flex items-center justify-center";

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
                {t("assistant.chat.title", { defaultValue: "Mira" })}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {t("assistant.chat.subtitle", { defaultValue: "Guidance & clinical support" })}
              </p>
            </div>
          </div>
          <div className="flex items-center">
            {!IS_DEMO && (
              <>
                <button onClick={newChat} className={iconBtn} aria-label={t("assistant.chat.new", { defaultValue: "New chat" })} title={t("assistant.chat.new", { defaultValue: "New chat" })}>
                  <Plus className="w-5 h-5" />
                </button>
                <button onClick={() => setShowHistory((v) => !v)} className={iconBtn} aria-label={t("assistant.chat.history", { defaultValue: "History" })} title={t("assistant.chat.history", { defaultValue: "History" })}>
                  <History className="w-5 h-5" />
                </button>
              </>
            )}
            <button onClick={onClose} className={iconBtn} aria-label={t("common.close", { defaultValue: "Close" })}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {showHistory ? (
          /* History list */
          <div className="flex-1 overflow-y-auto p-2">
            <button onClick={() => setShowHistory(false)} className="flex items-center gap-1 text-xs text-neutral-500 px-2 py-2 hover:text-neutral-700 dark:hover:text-neutral-300">
              <ChevronLeft className="w-4 h-4" />
              {t("assistant.chat.back", { defaultValue: "Back to chat" })}
            </button>
            {conversations.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">
                {t("assistant.chat.no_history", { defaultValue: "No conversations yet." })}
              </p>
            ) : (
              <div className="space-y-1">
                {conversations.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => openConversation(c.id)}
                    className={clsx(
                      "block w-full text-left px-3 py-2.5 rounded-xl transition-colors",
                      c.id === conversationId
                        ? "bg-primary-50 dark:bg-primary-900/20"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800",
                    )}
                  >
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 truncate">{c.title || t("assistant.chat.untitled", { defaultValue: "Conversation" })}</p>
                    {c.lastMessageAt?.toDate && (
                      <p className="text-[11px] text-neutral-400">
                        {c.lastMessageAt.toDate().toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
              {rendered.length === 0 ? (
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
                rendered.map((m, i) => (
                  <div key={m.id || i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={clsx(
                        "max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
                        m.role === "user"
                          ? "bg-primary-600 text-white rounded-br-md whitespace-pre-wrap"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md",
                      )}
                    >
                      {m.role === "user" ? (
                        m.content
                      ) : m.content ? (
                        <MarkdownMessage content={m.content} />
                      ) : streaming && i === rendered.length - 1 ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : null}
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
          </>
        )}

        <AiConsentModal isOpen={consentOpen} onClose={() => setConsentOpen(false)} onGranted={() => { setConsentOpen(false); send(); }} />
      </div>
    </div>
  );
}
