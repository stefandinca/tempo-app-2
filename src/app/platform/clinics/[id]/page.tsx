"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Loader2, Upload, X } from "lucide-react";
import { platformGet, platformPut, platformDelete, platformUpload, PlatformError } from "@/lib/platform/clientApi";
import type { ClinicDetail } from "@/lib/platform/types";
import { useToast } from "@/context/ToastContext";
import LicenceEditor from "@/components/platform/LicenceEditor";

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
  const { success, error: toastError } = useToast();
  const params = useParams<{ id: string }>();
  const [clinic, setClinic] = useState<ClinicDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [evalSaving, setEvalSaving] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (isRefresh = false) => {
    try {
      const d = await platformGet<{ clinic: ClinicDetail }>(`/api/platform/clinics/${params.id}`);
      setClinic(d.clinic);
      setError(null);
    } catch (e) {
      console.error("[platform/clinic] failed to load:", e);
      if (isRefresh) {
        // The write landed; only the re-read failed. Keep the page —
        // blanking it would report a failure that did not happen.
        toastError(t("platform.clinic.refresh_failed", {
          defaultValue: "Saved, but the page could not be refreshed.",
        }));
        return;
      }
      // A raw API error code — `server_error` — is not a message for a
      // human, and every sibling screen shows a translated one. Keep only
      // the distinction the operator can act on: a clinic that is not in
      // the registry, versus a request that failed.
      setError(e instanceof PlatformError && e.status === 404 ? "not_found" : "load_error");
    }
  }, [params.id, t, toastError]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load().finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [load]);

  async function toggleEvaluation(protocol: string) {
    if (!clinic || evalSaving) return;
    const next = clinic.disabledEvaluations.includes(protocol)
      ? clinic.disabledEvaluations.filter((p) => p !== protocol)
      : [...clinic.disabledEvaluations, protocol];
    setEvalSaving(true);
    try {
      await platformPut(`/api/platform/clinics/${clinic.tenantId}/evaluations`, { disabled: next });
      success(t("platform.clinic.evaluations_saved", { defaultValue: "Evaluation access updated." }));
      await load(true);
    } catch {
      toastError(t("platform.clinic.save_failed", { defaultValue: "Could not save." }));
    } finally {
      setEvalSaving(false);
    }
  }

  async function uploadBranding(file: File) {
    if (!clinic || brandingSaving) return;
    setBrandingSaving(true);
    try {
      await platformUpload(`/api/platform/clinics/${clinic.tenantId}/branding`, file);
      success(t("platform.clinic.branding_saved", { defaultValue: "Branding updated." }));
      await load(true);
    } catch {
      toastError(t("platform.clinic.save_failed", { defaultValue: "Could not save." }));
    } finally {
      setBrandingSaving(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function removeBranding() {
    if (!clinic || brandingSaving) return;
    setBrandingSaving(true);
    try {
      await platformDelete(`/api/platform/clinics/${clinic.tenantId}/branding`);
      success(t("platform.clinic.branding_saved", { defaultValue: "Branding updated." }));
      await load(true);
    } catch {
      toastError(t("platform.clinic.save_failed", { defaultValue: "Could not save." }));
    } finally {
      setBrandingSaving(false);
    }
  }

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary-500" /></div>;
  }
  if (error || !clinic) {
    return (
      <p className="text-error-600 dark:text-error-400 text-sm" role="alert">
        {error === "load_error"
          ? t("platform.clinic.load_error", { defaultValue: "Could not load this clinic." })
          : t("platform.clinic.not_found", { defaultValue: "Clinic not found." })}
      </p>
    );
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
          {t("platform.clinic.licence", { defaultValue: "Licence" })}
        </h3>
        <LicenceEditor tenantId={clinic.tenantId} value={clinic.licence} onSaved={() => { void load(true); }} />
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.evaluations", { defaultValue: "Evaluation access" })}
        </h3>
        <div className="flex flex-wrap gap-2">
          {PROTOCOLS.map((p) => {
            const enabled = !clinic.disabledEvaluations.includes(p);
            return (
              <button
                key={p}
                onClick={() => toggleEvaluation(p)}
                disabled={evalSaving}
                className={
                  enabled
                    ? "px-3 py-2 min-h-[44px] rounded-full text-xs font-semibold bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400 disabled:opacity-50 disabled:cursor-not-allowed"
                    : "px-3 py-2 min-h-[44px] rounded-full text-xs font-semibold bg-neutral-100 text-neutral-400 dark:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
                }
              >
                {PROTOCOL_LABELS[p] || p}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
        <h3 className="font-semibold mb-2 text-neutral-900 dark:text-white">
          {t("platform.clinic.branding", { defaultValue: "Branding" })}
        </h3>
        <div className="flex flex-wrap items-center gap-3">
          {clinic.brandingLogoUrl && (
            <img
              src={clinic.brandingLogoUrl}
              alt={clinic.name}
              className="h-11 w-11 rounded-lg object-contain border border-neutral-200 dark:border-neutral-700 bg-white"
            />
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadBranding(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={brandingSaving}
            className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {brandingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {t("platform.clinic.branding_upload", { defaultValue: "Upload logo" })}
          </button>
          {clinic.brandingLogoUrl && (
            <button
              onClick={removeBranding}
              disabled={brandingSaving}
              className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-error-50 dark:bg-error-900/20 text-error-700 dark:text-error-400 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {t("platform.clinic.branding_remove", { defaultValue: "Remove logo" })}
            </button>
          )}
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
