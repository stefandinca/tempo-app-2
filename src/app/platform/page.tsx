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
      .catch((e) => { if (!cancelled) setError(String(e.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
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

  if (error) {
    return <p className="text-error-600 dark:text-error-400 text-sm">{error}</p>;
  }

  return (
    <DataTable
      rows={clinics.map((c) => ({ ...c, id: c.tenantId }))}
      columns={columns}
      loading={loading}
      empty={t("platform.clinics.empty", { defaultValue: "No clinics registered." })}
      onRowClick={(c) => router.push(`/platform/clinics/${c.tenantId}`)}
    />
  );
}
