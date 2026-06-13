"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { formatUsd, totalTokens, type TokenUsage } from "@/lib/assistant/pricing";
import { Sparkles, X, Loader2, ChevronRight } from "lucide-react";

interface Conv {
  id: string;
  uid: string;
  userName?: string;
  title?: string;
  messageCount?: number;
  costUsd?: number;
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  lastMessageAt?: { toDate: () => Date } | null;
}
interface DetailMsg {
  id: string;
  role: "user" | "assistant";
  content: string;
  costUsd?: number;
  usage?: TokenUsage;
  toolsUsed?: string[];
  createdAt?: { toDate: () => Date } | null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{value}</p>
    </div>
  );
}

export default function AiUsagePage() {
  const { userRole } = useAuth();
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith("ro") ? "ro" : "en";
  const [convs, setConvs] = useState<Conv[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Conv | null>(null);
  const [detail, setDetail] = useState<DetailMsg[]>([]);

  useEffect(() => {
    if (userRole !== "Superadmin") return;
    const qy = query(collection(db, "ai_conversations"), orderBy("lastMessageAt", "desc"), limit(200));
    return onSnapshot(
      qy,
      (snap) => {
        setConvs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setLoading(false);
      },
      () => setLoading(false),
    );
  }, [userRole]);

  useEffect(() => {
    if (!selected) {
      setDetail([]);
      return;
    }
    const qy = query(collection(db, "ai_conversations", selected.id, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(qy, (snap) => setDetail(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as DetailMsg))));
  }, [selected]);

  const totals = useMemo(
    () =>
      convs.reduce(
        (a, c) => {
          a.cost += c.costUsd || 0;
          a.messages += c.messageCount || 0;
          a.tokens += (c.inputTokens || 0) + (c.outputTokens || 0) + (c.cacheReadTokens || 0) + (c.cacheWriteTokens || 0);
          return a;
        },
        { cost: 0, messages: 0, tokens: 0 },
      ),
    [convs],
  );

  const fmtDate = (ts?: { toDate: () => Date } | null) =>
    ts?.toDate
      ? ts.toDate().toLocaleString(lang === "ro" ? "ro-RO" : "en-US", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
      : "—";

  if (userRole !== "Superadmin") {
    return <div className="p-6 text-sm text-neutral-500">{t("ai_usage.forbidden", { defaultValue: "Only a Superadmin can view AI usage." })}</div>;
  }

  return (
    <main className="p-4 lg:p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-5 h-5 text-primary-500" />
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t("ai_usage.title", { defaultValue: "AI usage & cost" })}</h1>
      </div>
      <p className="text-sm text-neutral-500 mb-5">{t("ai_usage.subtitle", { defaultValue: "Every staff conversation with Mira and what it cost." })}</p>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label={t("ai_usage.total_cost", { defaultValue: "Total cost" })} value={formatUsd(totals.cost)} />
        <Stat label={t("ai_usage.conversations", { defaultValue: "Conversations" })} value={String(convs.length)} />
        <Stat label={t("ai_usage.tokens", { defaultValue: "Tokens" })} value={totals.tokens.toLocaleString()} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : convs.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-12">{t("ai_usage.empty", { defaultValue: "No AI conversations yet." })}</p>
      ) : (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                <th className="px-4 py-2.5 font-semibold">{t("ai_usage.staff", { defaultValue: "Staff" })}</th>
                <th className="px-4 py-2.5 font-semibold">{t("ai_usage.conversation", { defaultValue: "Conversation" })}</th>
                <th className="px-4 py-2.5 font-semibold text-right hidden sm:table-cell">{t("ai_usage.messages", { defaultValue: "Messages" })}</th>
                <th className="px-4 py-2.5 font-semibold text-right">{t("ai_usage.cost", { defaultValue: "Cost" })}</th>
                <th className="px-4 py-2.5 font-semibold text-right hidden md:table-cell">{t("ai_usage.last_active", { defaultValue: "Last active" })}</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {convs.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="border-b border-neutral-100 dark:border-neutral-800/60 last:border-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 cursor-pointer"
                >
                  <td className="px-4 py-3 text-neutral-700 dark:text-neutral-300 whitespace-nowrap">{c.userName || "—"}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 max-w-[16rem] truncate">{c.title || "—"}</td>
                  <td className="px-4 py-3 text-right text-neutral-500 hidden sm:table-cell">{c.messageCount || 0}</td>
                  <td className="px-4 py-3 text-right font-semibold text-neutral-900 dark:text-white">{formatUsd(c.costUsd || 0)}</td>
                  <td className="px-4 py-3 text-right text-neutral-400 text-xs hidden md:table-cell whitespace-nowrap">{fmtDate(c.lastMessageAt)}</td>
                  <td className="px-2 text-neutral-300"><ChevronRight className="w-4 h-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg h-full bg-white dark:bg-neutral-900 shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="min-w-0">
                <p className="font-bold text-neutral-900 dark:text-white truncate">{selected.title || t("assistant.chat.untitled", { defaultValue: "Conversation" })}</p>
                <p className="text-xs text-neutral-500">
                  {selected.userName} · {formatUsd(selected.costUsd || 0)} · {selected.messageCount || 0} {t("ai_usage.messages", { defaultValue: "messages" }).toLowerCase()}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 min-w-11 min-h-11 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {detail.map((m) => (
                <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={
                      "inline-block max-w-[90%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap text-left " +
                      (m.role === "user"
                        ? "bg-primary-600 text-white rounded-br-md"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md")
                    }
                  >
                    {m.content}
                  </div>
                  {m.role === "assistant" && (m.usage || m.costUsd != null) && (
                    <p className="text-[11px] text-neutral-400 mt-1">
                      {formatUsd(m.costUsd || 0)}
                      {m.usage ? ` · ${totalTokens(m.usage).toLocaleString()} ${t("ai_usage.tokens", { defaultValue: "tokens" }).toLowerCase()}` : ""}
                      {m.usage ? ` (${m.usage.inputTokens}+${m.usage.outputTokens}, cache ${m.usage.cacheReadTokens}r/${m.usage.cacheWriteTokens}w)` : ""}
                      {m.toolsUsed && m.toolsUsed.length ? ` · ${m.toolsUsed.join(", ")}` : ""}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
