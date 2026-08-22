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
  const [config, setConfig] = useState<Record<string, boolean> | null>(null);
  const [schedules, setSchedules] = useState<{ name: string; label: string; lastRunAt: string | null; ageMinutes: number | null; healthy: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  // A toast is transient; this is not. On the screen whose entire job is
  // telling you something is broken, a failed fetch must not fall through to
  // "No clinics registered."
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    platformGet<{ health: ClinicHealth[]; provisioning?: Record<string, boolean>; schedules?: { name: string; label: string; lastRunAt: string | null; ageMinutes: number | null; healthy: boolean }[] }>("/api/platform/health")
      .then((d) => { if (!cancelled) { setHealth(d.health); setConfig(d.provisioning ?? null); setSchedules(d.schedules ?? []); } })
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

  // Self-onboarding readiness. On the screen whose job is telling you what is
  // broken, a missing credential belongs next to a broken clinic — otherwise it
  // is only discoverable by a customer who has already paid.
  const readiness: [string, string][] = [
    ["vercelApiToken", t("platform.health.cfg_vercel_token", { defaultValue: "Vercel API token" })],
    ["vercelProjectId", t("platform.health.cfg_vercel_project", { defaultValue: "Vercel project id" })],
    ["sharedAnthropicKey", t("platform.health.cfg_anthropic", { defaultValue: "Shared Mira key" })],
    ["provisionApiToken", t("platform.health.cfg_provision_token", { defaultValue: "Signup API token" })],
    ["cronSecret", t("platform.health.cfg_cron", { defaultValue: "Cron secret" })],
    ["resendApiKey", t("platform.health.cfg_resend", { defaultValue: "Email (Resend)" })],
    ["stripeLive", t("platform.health.cfg_stripe_live", { defaultValue: "Stripe live key" })],
    ["stripeTest", t("platform.health.cfg_stripe_test", { defaultValue: "Stripe test key" })],
  ];

  return (
    <div className="space-y-6">
      {config && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="font-bold text-neutral-900 dark:text-white">
              {t("platform.health.selfonboarding", { defaultValue: "Self-onboarding readiness" })}
            </h2>
            <span className={config.canProvision ? "text-xs font-semibold text-success-600 dark:text-success-400" : "text-xs font-semibold text-error-600 dark:text-error-400"}>
              {config.canProvision
                ? t("platform.health.can_provision", { defaultValue: "Can create clinics" })
                : t("platform.health.cannot_provision", { defaultValue: "Cannot complete a signup" })}
            </span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {readiness.map(([k, label]) => (
              <li key={k} className="flex items-center justify-between text-sm">
                <span className="text-neutral-600 dark:text-neutral-300">{label}</span>
                <Flag ok={!!config[k]} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {schedules.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-4">
          <h2 className="font-bold text-neutral-900 dark:text-white mb-1">
            {t("platform.health.schedules", { defaultValue: "Scheduled jobs" })}
          </h2>
          {/* A job that never runs looks exactly like one with nothing to do. */}
          <p className="text-xs text-neutral-500 mb-3">
            {t("platform.health.schedules_hint", { defaultValue: "A job that stops running is silent. This is the only place it shows." })}
          </p>
          <ul className="space-y-1.5">
            {schedules.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-neutral-600 dark:text-neutral-300">{s.label}</span>
                <span className="flex items-center gap-2">
                  <span className={s.healthy ? "text-xs text-neutral-500" : "text-xs font-semibold text-error-600 dark:text-error-400"}>
                    {s.lastRunAt === null
                      ? t("platform.health.never_ran", { defaultValue: "never run" })
                      : t("platform.health.ago", { defaultValue: "{{n}} min ago", n: s.ageMinutes })}
                  </span>
                  <Flag ok={s.healthy} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <DataTable
        rows={health}
        getRowId={(h) => h.tenantId}
        columns={columns}
        loading={loading}
        error={loadError}
        empty={t("platform.health.empty", { defaultValue: "No clinics registered." })}
      />
    </div>
  );
}
