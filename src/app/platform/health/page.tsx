"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X } from "lucide-react";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicHealth } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";
import { useToast } from "@/context/ToastContext";

function Flag({ ok }: { ok: boolean }) {
  return ok ? (
    <Check className="w-4 h-4 text-success-600 dark:text-success-400 inline" />
  ) : (
    <X className="w-4 h-4 text-error-600 dark:text-error-400 inline" />
  );
}

export default function PlatformHealthPage() {
  const { t } = useTranslation();
  const { error: toastError } = useToast();
  const [health, setHealth] = useState<ClinicHealth[]>([]);
  const [loading, setLoading] = useState(true);
  // A toast is transient; this is not. On the screen whose entire job is
  // telling you something is broken, a failed fetch must not fall through to
  // "No clinics registered."
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ health: ClinicHealth[] }>("/api/platform/health")
      .then((d) => { if (!cancelled) setHealth(d.health); })
      .catch((e) => {
        console.error("[platform/health] failed to load:", e);
        if (cancelled) return;
        setLoadError(t("platform.health.load_error", { defaultValue: "Could not load clinic health." }));
        toastError(t("platform.load_failed", { defaultValue: "Could not load." }));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<ClinicHealth>[] = [
    { key: "name", header: t("platform.health.clinic", { defaultValue: "Clinic" }), render: (c) => <span className="font-semibold">{c.name}</span> },
    { key: "db", header: t("platform.health.database", { defaultValue: "Database" }), align: "right", render: (c) => <Flag ok={c.databaseReachable} /> },
    { key: "bucket", header: t("platform.health.bucket", { defaultValue: "Bucket" }), align: "right", render: (c) => <Flag ok={c.bucketConfigured} /> },
    { key: "mira", header: t("platform.health.mira", { defaultValue: "Mira key" }), align: "right", render: (c) => <Flag ok={c.anthropicKeyPresent} /> },
    { key: "licence", header: t("platform.health.licence", { defaultValue: "Licence" }), align: "right", render: (c) => <Flag ok={c.licencePresent} /> },
    // The rules enforce the clinic's mirror, not the registry. A cross here
    // means the clinic is being held to a deadline nobody set in the console.
    {
      key: "licenceSync",
      header: t("platform.health.licence_sync", { defaultValue: "Licence in sync" }),
      align: "right",
      render: (c) => <Flag ok={c.licenceInSync} />,
    },
    {
      key: "error",
      header: t("platform.health.error", { defaultValue: "Error" }),
      render: (c) =>
        c.error ? (
          <span
            title={c.error}
            className="block max-w-[16rem] truncate text-xs text-error-600 dark:text-error-400"
          >
            {c.error}
          </span>
        ) : (
          ""
        ),
    },
  ];

  return (
    <DataTable
      rows={health}
      getRowId={(h) => h.tenantId}
      columns={columns}
      loading={loading}
      error={loadError}
      empty={t("platform.health.empty", { defaultValue: "No clinics registered." })}
    />
  );
}
