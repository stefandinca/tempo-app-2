"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformGet } from "@/lib/platform/clientApi";
import type { Lead } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";
import { useToast } from "@/context/ToastContext";

export default function PlatformLeadsPage() {
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  // What the collection actually holds, which the query caps. Rendering the
  // capped list on its own would read as the whole pipeline.
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ leads: Lead[]; total: number }>("/api/platform/leads")
      .then((d) => {
        if (cancelled) return;
        setLeads(d.leads);
        setTotal(d.total ?? d.leads.length);
      })
      .catch((e) => {
        console.error("[platform/leads] failed to load:", e);
        if (cancelled) return;
        setLoadError(t("platform.leads.load_error", { defaultValue: "Could not load leads." }));
        toastError(t("platform.load_failed", { defaultValue: "Could not load." }));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<Lead>[] = [
    { key: "name", header: t("platform.leads.name", { defaultValue: "Name" }), render: (l) => <span className="font-semibold">{l.name || "—"}</span> },
    { key: "clinic", header: t("platform.leads.clinic", { defaultValue: "Centre" }), render: (l) => l.clinic || "—" },
    {
      key: "contact",
      header: t("platform.leads.contact", { defaultValue: "Contact" }),
      render: (l) => (
        <div className="text-xs">
          {l.email && <a href={`mailto:${l.email}`} className="block text-primary-600 hover:underline">{l.email}</a>}
          {l.phone && <a href={`tel:${l.phone}`} className="block text-neutral-500">{l.phone}</a>}
        </div>
      ),
    },
    { key: "when", header: t("platform.leads.when", { defaultValue: "When" }), align: "right", render: (l) => (l.createdAt || "").slice(0, 10) || "—" },
  ];

  return (
    <div className="space-y-4">
      {!loadError && total > leads.length && (
        <p className="text-xs text-neutral-500">
          {t("platform.truncated", {
            defaultValue: "Showing the {{shown}} most recent of {{total}}.",
            shown: leads.length,
            total,
          })}
        </p>
      )}
      <DataTable
        rows={leads}
        columns={columns}
        loading={loading}
        error={loadError}
        getRowId={(l) => l.id}
        empty={t("platform.leads.empty", { defaultValue: "No leads yet." })}
      />
    </div>
  );
}
