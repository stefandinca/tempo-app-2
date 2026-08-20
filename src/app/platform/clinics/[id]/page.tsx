"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2 } from "lucide-react";
import { platformGet } from "@/lib/platform/clientApi";
import type { ClinicDetail } from "@/lib/platform/types";

const PROTOCOLS = ["ablls", "vbmapp", "portage", "cars", "carolina"];

// Proper nouns, identical in English and Romanian — no t() needed.
const PROTOCOL_LABELS: Record<string, string> = {
  ablls: "ABLLS-R",
  vbmapp: "VB-MAPP",
  portage: "Portage",
  cars: "CARS",
  carolina: "Carolina",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b last:border-0 border-neutral-100 dark:border-neutral-800/60">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-sm font-medium text-neutral-900 dark:text-white text-right">{value}</span>
    </div>
  );
}

export default function PlatformClinicDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ clinic: ClinicDetail }>(`/api/platform/clinics/${params.id}`)
      .then((d) => { if (!cancelled) setClinic(d.clinic); })
      .catch((e) => { if (!cancelled) setError(String(e.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  }
  if (error || !clinic) {
    return <p className="text-error-600 text-sm">{error || t("platform.clinic.not_found", { defaultValue: "Clinic not found." })}</p>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/platform" className="inline-flex items-center gap-2 min-h-[44px] text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200">
        <ArrowLeft className="w-4 h-4" />
        {t("platform.clinic.back", { defaultValue: "All clinics" })}
      </Link>

      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{clinic.name}</h2>
        <a href={`https://${clinic.host}`} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">
          {clinic.host}
        </a>
      </div>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.details", { defaultValue: "Details" })}
        </h3>
        <Row label={t("platform.clinic.database", { defaultValue: "Database" })} value={<code className="text-xs">{clinic.databaseId}</code>} />
        <Row label={t("platform.clinic.bucket", { defaultValue: "Storage bucket" })} value={<code className="text-xs">{clinic.bucket || "—"}</code>} />
        <Row label={t("platform.clinic.legal_name", { defaultValue: "Legal entity" })} value={clinic.legalName || "—"} />
        <Row label={t("platform.clinic.status", { defaultValue: "Status" })} value={clinic.status} />
        <Row label={t("platform.clinic.clients", { defaultValue: "Clients" })} value={clinic.counts.clients} />
        <Row label={t("platform.clinic.events", { defaultValue: "Sessions" })} value={clinic.counts.events} />
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.evaluations", { defaultValue: "Evaluation access" })}
        </h3>
        <p className="text-xs text-neutral-500 mb-3">
          {t("platform.clinic.evaluations_hint", { defaultValue: "Read-only for now — editing arrives with Phase 2." })}
        </p>
        <div className="flex flex-wrap gap-2">
          {PROTOCOLS.map((p) => {
            const enabled = !clinic.disabledEvaluations.includes(p);
            return (
              <span
                key={p}
                className={
                  enabled
                    ? "px-3 py-1 rounded-full text-xs font-semibold bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
                    : "px-3 py-1 rounded-full text-xs font-semibold bg-neutral-100 text-neutral-400 dark:bg-neutral-800"
                }
              >
                {PROTOCOL_LABELS[p] || p}
              </span>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.staff", { defaultValue: "Staff" })}
        </h3>
        {clinic.staff.map((s) => (
          <Row key={s.uid} label={`${s.name} · ${s.role}`} value={<span className="text-xs text-neutral-500">{s.email}</span>} />
        ))}
      </section>
    </div>
  );
}
