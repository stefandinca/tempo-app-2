"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicSummary } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";

export default function PlatformClinicsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [clinics, setClinics] = useState<ClinicSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ clinics: ClinicSummary[] }>("/api/platform/clinics")
      .then((d) => { if (!cancelled) setClinics(d.clinics); })
      .catch((e) => {
        console.error("[platform/clinics] failed to load:", e);
        if (!cancelled) setError(t("platform.clinics.error", { defaultValue: "Could not load clinics." }));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns: Column<ClinicSummary>[] = [
    {
      key: "name",
      header: t("platform.clinics.name", { defaultValue: "Clinic" }),
      render: (c) => (
        <div>
          <p className="font-semibold">{c.name}</p>
          <p className="text-xs text-neutral-500">{c.host}</p>
        </div>
      ),
    },
    {
      key: "licence",
      header: t("platform.clinics.licence", { defaultValue: "Licence" }),
      render: (c) =>
        !c.licence ? (
          <span className="text-warning-600 dark:text-warning-400">
            {t("platform.clinics.no_licence", { defaultValue: "none — unlimited" })}
          </span>
        ) : c.licence.plan === "lifetime" ? (
          t("platform.clinics.lifetime", { defaultValue: "lifetime" })
        ) : (
          (c.licence.expiresAt || "").slice(0, 10)
        ),
    },
    { key: "clients", header: t("platform.clinics.clients", { defaultValue: "Clients" }), align: "right", render: (c) => c.counts.clients },
    { key: "staff", header: t("platform.clinics.staff", { defaultValue: "Staff" }), align: "right", render: (c) => c.counts.staff },
    { key: "events", header: t("platform.clinics.events", { defaultValue: "Sessions" }), align: "right", render: (c) => c.counts.events },
  ];

  // The bespoke early return this page used to carry now lives in DataTable,
  // so all five list screens report a failed load the same way.
  return (
    <DataTable
      rows={clinics}
      columns={columns}
      loading={loading}
      error={error}
      empty={t("platform.clinics.empty", { defaultValue: "No clinics registered." })}
      getRowId={(c) => c.tenantId}
      onRowClick={(c) => router.push(`/platform/clinics/${c.tenantId}`)}
    />
  );
}
