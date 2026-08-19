"use client";

import { useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { logActivity } from "@/lib/activityService";
import { Loader2, Search, ClipboardList, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

/**
 * Superadmin-only: per-client control over which evaluation protocols are
 * available. Disabling one hides it from every other role — the matching
 * Firestore rules deny reads of that subcollection, so this is real access
 * control rather than a UI preference.
 *
 * Stored as an OPT-OUT list on the client document (`disabledEvaluations`), so a
 * client with no field has everything enabled. An allowlist would have hidden
 * every protocol for every existing client the moment the rules deployed.
 */

export const EVALUATION_KINDS = [
  { id: "ablls", name: "ABLLS-R" },
  { id: "vbmapp", name: "VB-MAPP" },
  { id: "portage", name: "Portage" },
  { id: "cars", name: "CARS" },
  { id: "carolina", name: "Carolina" },
] as const;

export type EvaluationKind = (typeof EVALUATION_KINDS)[number]["id"];

/** True when `kind` is available for this client. Absent field = all enabled. */
export function isEvaluationEnabled(client: any, kind: string): boolean {
  const disabled = client?.disabledEvaluations;
  return !Array.isArray(disabled) || !disabled.includes(kind);
}

export default function EvaluationAccessTab() {
  const { t } = useTranslation();
  const { clients } = useData();
  const { user, userData } = useAuth();
  const { success, error } = useToast();
  const [search, setSearch] = useState("");
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.data
      .filter((c: any) => !c.isArchived)
      .filter((c: any) => !q || String(c.name || "").toLowerCase().includes(q))
      .sort((a: any, b: any) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [clients.data, search]);

  const toggle = async (client: any, kind: EvaluationKind) => {
    const key = `${client.id}:${kind}`;
    setSavingKey(key);
    const currentlyEnabled = isEvaluationEnabled(client, kind);
    const existing: string[] = Array.isArray(client.disabledEvaluations) ? client.disabledEvaluations : [];
    const next = currentlyEnabled
      ? Array.from(new Set([...existing, kind]))
      : existing.filter((k) => k !== kind);

    try {
      await updateDoc(doc(db, "clients", client.id), { disabledEvaluations: next });

      if (user && userData) {
        // Non-blocking, per the project convention that every mutation is logged.
        logActivity({
          type: "client_updated",
          userId: user.uid,
          userName: userData.name || user.email || "Unknown",
          userPhotoURL: userData.photoURL || undefined,
          targetId: client.id,
          targetName: client.name || "",
          metadata: {
            clientId: client.id,
            clientName: client.name,
            evaluationKind: kind,
            enabled: !currentlyEnabled,
          },
        }).catch((err) => console.error("Failed to log evaluation access change:", err));
      }

      success(t("settings.evaluation_access.saved"));
    } catch (err) {
      console.error(err);
      error(t("settings.evaluation_access.save_error"));
    } finally {
      setSavingKey(null);
    }
  };

  if (clients.loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t("settings.evaluation_access.title")}
          </h3>
          <p className="text-sm text-neutral-500">{t("settings.evaluation_access.subtitle")}</p>
        </div>
      </div>

      <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-3">
        <p className="text-sm text-warning-800 dark:text-warning-200">
          {t("settings.evaluation_access.warning")}
        </p>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("settings.evaluation_access.search_placeholder")}
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
        />
      </div>

      <div className="overflow-x-auto -mx-2 px-2">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left border-b border-neutral-200 dark:border-neutral-800">
              <th className="py-2.5 pr-4 font-semibold text-neutral-500">
                {t("settings.evaluation_access.client")}
              </th>
              {EVALUATION_KINDS.map((k) => (
                <th key={k.id} className="py-2.5 px-2 font-semibold text-neutral-500 text-center whitespace-nowrap">
                  {k.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((client: any) => (
              <tr
                key={client.id}
                className="border-b border-neutral-100 dark:border-neutral-800/60 hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
              >
                <td className="py-2.5 pr-4 font-medium text-neutral-900 dark:text-white">{client.name}</td>
                {EVALUATION_KINDS.map((k) => {
                  const enabled = isEvaluationEnabled(client, k.id);
                  const key = `${client.id}:${k.id}`;
                  const busy = savingKey === key;
                  return (
                    <td key={k.id} className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => !busy && toggle(client, k.id)}
                        disabled={busy}
                        aria-pressed={enabled}
                        aria-label={`${client.name} — ${k.name}`}
                        title={enabled
                          ? t("settings.evaluation_access.click_to_disable")
                          : t("settings.evaluation_access.click_to_enable")}
                        className={clsx(
                          "w-11 h-11 rounded-xl inline-flex items-center justify-center transition-colors",
                          busy && "opacity-50 cursor-wait",
                          enabled
                            ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 hover:bg-success-200"
                            : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 hover:bg-neutral-200",
                        )}
                      >
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : enabled ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <X className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={EVALUATION_KINDS.length + 1} className="py-10 text-center text-neutral-400">
                  {t("settings.evaluation_access.no_clients")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
