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

  useEffect(() => {
    let cancelled = false;
    platformGet<{ spend: ClinicSpend[] }>("/api/platform/ai-usage")
      .then((d) => { if (!cancelled) setSpend(d.spend); })
      .catch(() => { if (!cancelled) toastError(t("platform.load_failed", { defaultValue: "Could not load." })); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = spend.reduce((s, c) => s + c.costUsd, 0);

  const columns: Column<ClinicSpend>[] = [
    { key: "name", header: t("platform.ai.clinic", { defaultValue: "Clinic" }), render: (c) => <span className="font-semibold">{c.name}</span> },
    { key: "convs", header: t("platform.ai.conversations", { defaultValue: "Chats" }), align: "right", render: (c) => c.conversations },
    { key: "insights", header: t("platform.ai.insights", { defaultValue: "Insights" }), align: "right", render: (c) => c.insightEvents },
    { key: "cost", header: t("platform.ai.cost", { defaultValue: "Cost (USD)" }), align: "right", render: (c) => `$${c.costUsd.toFixed(4)}` },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500">
        {t("platform.ai.total", { defaultValue: "Total across all clinics" })}:{" "}
        <span className="font-bold text-neutral-900 dark:text-white">${total.toFixed(4)}</span>
      </p>
      <DataTable
        rows={spend}
        getRowId={(s) => s.tenantId}
        columns={columns}
        loading={loading}
        empty={t("platform.ai.empty", { defaultValue: "No usage recorded." })}
      />
    </div>
  );
}
