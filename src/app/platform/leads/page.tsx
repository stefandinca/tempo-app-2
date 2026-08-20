"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { platformGet, platformPatch } from "@/lib/platform/clientApi";
import type { Lead } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";
import { useToast } from "@/context/ToastContext";

const NEXT_STATUS: Record<string, string> = {
  new: "contacted",
  contacted: "qualified",
  qualified: "closed",
  closed: "new",
};

type SourceFilter = "all" | "marketing" | "demo";

export default function PlatformLeadsPage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  // What the two collections actually hold, which the query caps. Rendering
  // the capped list on its own would read as the whole pipeline.
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [source, setSource] = useState<SourceFilter>("all");
  // Per-row in-flight guard, same shape as the bug-reports page: every state
  // transition below touches only the clicked row's entry via a functional
  // update, so two different rows can be updated concurrently without one's
  // rollback clobbering the other's committed change. This set only exists to
  // stop the SAME row firing a second PATCH while its first is in flight.
  const [pending, setPending] = useState<Set<string>>(new Set());

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

  async function cycleStatus(lead: Lead) {
    if (lead.source !== "marketing" || pending.has(lead.id)) return;
    const status = NEXT_STATUS[lead.status || "new"] || "new";
    setPending((p) => new Set(p).add(lead.id));
    setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status } : l)));
    try {
      await platformPatch("/api/platform/leads", { id: lead.id, status });
      success(t("platform.leads.updated", { defaultValue: "Status updated." }));
    } catch {
      setLeads((ls) => ls.map((l) => (l.id === lead.id ? { ...l, status: lead.status } : l)));
      toastError(t("platform.leads.update_failed", { defaultValue: "Could not update." }));
    } finally {
      setPending((p) => {
        const n = new Set(p);
        n.delete(lead.id);
        return n;
      });
    }
  }

  // Client-side: the fetch already brought back both sources capped at the
  // route's PAGE each, so filtering here never re-requests anything.
  const filtered = useMemo(
    () => (source === "all" ? leads : leads.filter((l) => l.source === source)),
    [leads, source],
  );

  const columns: Column<Lead>[] = [
    {
      key: "name",
      header: t("platform.leads.name", { defaultValue: "Name" }),
      render: (l) => (
        <div className="max-w-xs">
          <p className="font-semibold">{l.name || "—"}</p>
          {l.source === "marketing" && l.message && (
            <p className="text-xs text-neutral-500 line-clamp-2">{l.message}</p>
          )}
        </div>
      ),
    },
    {
      key: "source",
      header: t("platform.leads.source", { defaultValue: "Source" }),
      render: (l) => (
        <span
          className={clsx(
            "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold",
            l.source === "marketing"
              ? "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400"
              : "bg-secondary-100 text-secondary-700 dark:bg-secondary-900/30 dark:text-secondary-400",
          )}
        >
          {l.source === "marketing"
            ? t("platform.leads.source_marketing", { defaultValue: "Marketing" })
            : t("platform.leads.source_demo", { defaultValue: "Demo" })}
        </span>
      ),
    },
    {
      key: "clinic",
      header: t("platform.leads.clinic", { defaultValue: "Centre" }),
      render: (l) => (l.source === "demo" ? l.clinic || "—" : ""),
    },
    {
      key: "team_size",
      header: t("platform.leads.team_size", { defaultValue: "Team size" }),
      render: (l) => (l.source === "marketing" ? l.teamSize || "—" : ""),
    },
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
    { key: "when", header: t("platform.leads.when", { defaultValue: "When" }), render: (l) => (l.createdAt || "").slice(0, 10) || "—" },
    {
      key: "status",
      header: t("platform.leads.status", { defaultValue: "Status" }),
      align: "right",
      render: (l) =>
        l.source === "marketing" ? (
          <button
            onClick={(e) => { e.stopPropagation(); cycleStatus(l); }}
            disabled={pending.has(l.id)}
            className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {l.status || "—"}
          </button>
        ) : (
          "—"
        ),
    },
  ];

  const filterOptions: { id: SourceFilter; label: string }[] = [
    { id: "all", label: t("platform.leads.filter_all", { defaultValue: "All" }) },
    { id: "marketing", label: t("platform.leads.filter_marketing", { defaultValue: "Marketing" }) },
    { id: "demo", label: t("platform.leads.filter_demo", { defaultValue: "Demo" }) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {filterOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSource(opt.id)}
            aria-pressed={source === opt.id}
            className={clsx(
              "px-4 min-h-[44px] rounded-full text-sm font-medium transition-colors",
              source === opt.id
                ? "bg-primary-500 text-white shadow-sm"
                : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {!loadError && source === "all" && total > leads.length && (
        <p className="text-xs text-neutral-500">
          {t("platform.truncated", {
            defaultValue: "Showing the {{shown}} most recent of {{total}}.",
            shown: filtered.length,
            total,
          })}
        </p>
      )}
      <DataTable
        rows={filtered}
        columns={columns}
        loading={loading}
        error={loadError}
        getRowId={(l) => l.id}
        empty={t("platform.leads.empty", { defaultValue: "No leads yet." })}
      />
    </div>
  );
}
