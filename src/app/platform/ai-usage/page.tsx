"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicSpend } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";
import { useToast } from "@/context/ToastContext";

export default function PlatformAiUsagePage() {
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const [spend, setSpend] = useState<ClinicSpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ spend: ClinicSpend[] }>("/api/platform/ai-usage")
      .then((d) => { if (!cancelled) setSpend(d.spend); })
      .catch((e) => {
        console.error("[platform/ai-usage] failed to load:", e);
        if (cancelled) return;
        setLoadError(t("platform.ai.load_error", { defaultValue: "Could not load Mira spend." }));
        toastError(t("platform.load_failed", { defaultValue: "Could not load." }));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A clinic whose ledgers could not both be read contributes nothing to the
  // total. This figure is what an invoice gets reconciled against, so a sum
  // that is silently short is worse than one that says what it left out.
  const unread = spend.filter((c) => c.partial);
  const total = spend.reduce((s, c) => (c.partial ? s : s + c.costUsd), 0);

  /**
   * Every number on a partial row is untrustworthy: the ledger that failed
   * contributes a fabricated 0 to its count and to the cost. Rendering "—"
   * loses the one count that did succeed, which is a fair trade against
   * printing a zero that reads as "this clinic used nothing".
   */
  const cell = (c: ClinicSpend, value: () => React.ReactNode) =>
    c.partial ? (
      <span
        title={t("platform.ai.partial", { defaultValue: "Could not be read." })}
        className="text-warning-600 dark:text-warning-400"
      >
        —
      </span>
    ) : (
      value()
    );

  const columns: Column<ClinicSpend>[] = [
    { key: "name", header: t("platform.ai.clinic", { defaultValue: "Clinic" }), render: (c) => <span className="font-semibold">{c.name}</span> },
    { key: "convs", header: t("platform.ai.conversations", { defaultValue: "Chats" }), align: "right", render: (c) => cell(c, () => c.conversations) },
    { key: "insights", header: t("platform.ai.insights", { defaultValue: "Insights" }), align: "right", render: (c) => cell(c, () => c.insightEvents) },
    { key: "cost", header: t("platform.ai.cost", { defaultValue: "Cost (USD)" }), align: "right", render: (c) => cell(c, () => `$${c.costUsd.toFixed(4)}`) },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        {t("platform.ai.total", { defaultValue: "Total across all clinics" })}:{" "}
        <span className="font-bold text-neutral-900 dark:text-white">${total.toFixed(4)}</span>
        {unread.length > 0 && (
          <span className="ml-2 text-warning-600 dark:text-warning-400">
            {t("platform.ai.total_partial", {
              defaultValue: "excludes clinics whose spend could not be read ({{n}}): {{names}}",
              n: unread.length,
              names: unread.map((c) => c.name).join(", "),
            })}
          </span>
        )}
      </p>
      <DataTable
        rows={spend}
        getRowId={(s) => s.tenantId}
        columns={columns}
        loading={loading}
        error={loadError}
        empty={t("platform.ai.empty", { defaultValue: "No usage recorded." })}
      />
    </div>
  );
}
