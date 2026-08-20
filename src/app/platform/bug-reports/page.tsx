"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { platformGet, platformPatch } from "@/lib/platform/clientApi";
import type { BugReport } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";
import { useToast } from "@/context/ToastContext";

const NEXT_STATUS: Record<string, string> = {
  new: "triaged",
  triaged: "resolved",
  resolved: "new",
  wontfix: "new",
};

export default function PlatformBugReportsPage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ reports: BugReport[] }>("/api/platform/bug-reports")
      .then((d) => { if (!cancelled) setReports(d.reports); })
      .catch(() => { if (!cancelled) toastError(t("platform.load_failed", { defaultValue: "Could not load." })); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cycleStatus(report: BugReport) {
    const status = NEXT_STATUS[report.status] || "triaged";
    const previous = reports;
    setReports((rs) => rs.map((r) => (r.id === report.id ? { ...r, status } : r)));
    try {
      await platformPatch("/api/platform/bug-reports", { id: report.id, status });
      success(t("platform.bug_reports.updated", { defaultValue: "Status updated." }));
    } catch {
      setReports(previous);
      toastError(t("platform.bug_reports.update_failed", { defaultValue: "Could not update." }));
    }
  }

  const columns: Column<BugReport>[] = [
    {
      key: "title",
      header: t("platform.bug_reports.report", { defaultValue: "Report" }),
      render: (r) => (
        <div className="max-w-md">
          <p className="font-semibold">{r.title}</p>
          <p className="text-xs text-neutral-500 line-clamp-2">{r.description}</p>
        </div>
      ),
    },
    { key: "tenant", header: t("platform.bug_reports.clinic", { defaultValue: "Clinic" }), render: (r) => r.tenantId || "—" },
    { key: "page", header: t("platform.bug_reports.page", { defaultValue: "Page" }), render: (r) => r.page || "—" },
    { key: "by", header: t("platform.bug_reports.by", { defaultValue: "Reported by" }), render: (r) => r.reportedBy?.name || "—" },
    { key: "when", header: t("platform.bug_reports.when", { defaultValue: "When" }), render: (r) => (r.createdAt || "").slice(0, 10) || "—" },
    {
      key: "status",
      header: t("platform.bug_reports.status", { defaultValue: "Status" }),
      align: "right",
      render: (r) => (
        <button
          onClick={(e) => { e.stopPropagation(); cycleStatus(r); }}
          className="px-3 py-2 min-h-[44px] rounded-lg text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700"
        >
          {r.status}
        </button>
      ),
    },
  ];

  return (
    <DataTable
      rows={reports}
      columns={columns}
      loading={loading}
      empty={t("platform.bug_reports.empty", { defaultValue: "No bug reports." })}
    />
  );
}
