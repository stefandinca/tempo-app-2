"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { Loader2, RefreshCw } from "lucide-react";
import { platformGet, platformPost } from "@/lib/platform/clientApi";
import type { ProvisionRow, SignupRow } from "@/lib/platform/types";
import DataTable, { type Column } from "@/components/platform/DataTable";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";

/**
 * What happened to the people who signed up.
 *
 * The screen that did not exist when a customer paid, saw "your clinic was
 * created but the setup did not finish", and nobody here could say why. It is
 * two tables on purpose: a signup can fail before any clinic is attempted — a
 * webhook that never landed leaves a sale with no provision behind it — and a
 * screen that only listed attempts would be empty for exactly that case.
 */
interface Payload {
  provisions: ProvisionRow[];
  signups: SignupRow[];
  /** What the collections actually hold. The rows are a capped slice of it. */
  total?: { provisions: number; signups: number };
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short" }) : "—";

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap",
        tone === "ok" && "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
        tone === "warn" && "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
        tone === "bad" && "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
        tone === "muted" && "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300",
      )}
    >
      {children}
    </span>
  );
}

/**
 * How much of the history this is.
 *
 * The rows are a capped slice, and a slice that does not say so reads as the
 * whole list — which on this screen would mean "there is no signup for that
 * customer" when there simply was not room for it.
 */
function Showing({ shown, total }: { shown: number; total?: number }) {
  const { t } = useTranslation();
  if (!total || total <= shown) return null;
  return (
    <p className="mt-2 text-xs text-neutral-500">
      {t("platform.provisions.showing", {
        defaultValue: "Showing the {{shown}} most recent of {{total}}.",
        shown,
        total,
      })}
    </p>
  );
}

export default function PlatformProvisionsPage() {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const [data, setData] = useState<Payload>({ provisions: [], signups: [] });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [resuming, setResuming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await platformGet<Payload>("/api/platform/provisions");
      setData({ provisions: d.provisions || [], signups: d.signups || [], total: d.total });
      setLoadError(null);
    } catch (e) {
      console.error("[platform/provisions] failed to load:", e);
      // A toast disappears. On the screen whose job is telling you why a
      // signup broke, a failed fetch must not fall through to "No signups yet."
      setLoadError(t("platform.provisions.load_error", { defaultValue: "Could not load signups." }));
      toastError(t("platform.load_failed", { defaultValue: "Could not load." }));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resume(row: ProvisionRow) {
    confirm({
      title: t("platform.provisions.resume", { defaultValue: "Resume setup" }),
      message: t("platform.provisions.resume_confirm", {
        defaultValue:
          "This re-runs the step that failed. Nothing is rebuilt — every step that already succeeded is skipped. Fix the cause first, or it will fail the same way.",
      }),
      confirmLabel: t("platform.provisions.resume", { defaultValue: "Resume setup" }),
      onConfirm: () => { void doResume(row); },
    });
  }

  async function doResume(row: ProvisionRow) {
    setResuming(row.provisionId);
    try {
      await platformPost("/api/platform/provisions", { provisionId: row.provisionId });
      success(t("platform.provisions.resumed", { defaultValue: "Resumed. The queue picks it up within a minute." }));
      await load();
    } catch {
      toastError(t("platform.provisions.resume_failed", { defaultValue: "Could not resume." }));
    } finally {
      setResuming(null);
    }
  }

  const provisionColumns: Column<ProvisionRow>[] = [
    {
      key: "clinic",
      header: t("platform.provisions.clinic", { defaultValue: "Clinic" }),
      render: (r) => (
        <div className="max-w-[14rem]">
          <p className="font-semibold">{r.clinicName || "—"}</p>
          <p className="text-xs text-neutral-500 truncate">
            {r.label}.tempoapp.ro · {r.adminEmail}
          </p>
        </div>
      ),
    },
    {
      key: "status",
      header: t("platform.provisions.status", { defaultValue: "Status" }),
      render: (r) => (
        <div className="space-y-1">
          <Badge tone={r.status === "ready" ? "ok" : r.status === "failed" ? "bad" : "warn"}>
            {r.status === "ready"
              ? t("platform.provisions.status_ready", { defaultValue: "Ready" })
              : r.status === "failed"
                ? t("platform.provisions.status_failed", { defaultValue: "Failed" })
                : t("platform.provisions.status_running", { defaultValue: "In progress" })}
          </Badge>
          {/* The step key, untranslated on purpose: it is the shared contract
              with tempo-web and with the logs, and renaming it here would mean
              two vocabularies for one machine. */}
          <p className="text-xs text-neutral-500">
            {r.step} · {t("platform.provisions.attempt", { defaultValue: "attempt" })} {r.attempt}
          </p>
        </div>
      ),
    },
    {
      key: "error",
      header: t("platform.provisions.error", { defaultValue: "What went wrong" }),
      render: (r) =>
        r.status === "failed" ? (
          <div className="max-w-md space-y-1">
            <p className="text-xs font-semibold text-error-600 dark:text-error-400">
              {r.errorCode} → {r.recovery}
            </p>
            {/* Whole, wrapped, never truncated. Reading half an error means
                opening the function logs, which is what this screen replaces. */}
            <p className="text-xs whitespace-pre-wrap break-words text-neutral-600 dark:text-neutral-300">
              {r.error || "—"}
            </p>
          </div>
        ) : r.status === "ready" && r.inviteSent === false ? (
          <div className="max-w-md">
            <Badge tone="warn">
              {t("platform.provisions.no_invite", { defaultValue: "No password link sent" })}
            </Badge>
            <p className="mt-1 text-xs whitespace-pre-wrap break-words text-neutral-600 dark:text-neutral-300">
              {r.inviteError || "—"}
            </p>
          </div>
        ) : (
          ""
        ),
    },
    {
      key: "started",
      header: t("platform.provisions.started", { defaultValue: "Started" }),
      render: (r) => <span className="text-xs text-neutral-500 whitespace-nowrap">{when(r.startedAt)}</span>,
    },
    {
      key: "action",
      header: "",
      align: "right",
      render: (r) =>
        r.status === "failed" ? (
          <button
            type="button"
            onClick={() => resume(r)}
            disabled={resuming === r.provisionId}
            className="min-h-[44px] px-4 rounded-xl text-sm font-semibold bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50"
          >
            {resuming === r.provisionId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              t("platform.provisions.resume", { defaultValue: "Resume setup" })
            )}
          </button>
        ) : r.url ? (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center min-h-[44px] px-4 text-sm font-semibold text-primary-600 dark:text-primary-400"
          >
            {t("platform.provisions.open", { defaultValue: "Open" })}
          </a>
        ) : (
          ""
        ),
    },
  ];

  const signupColumns: Column<SignupRow>[] = [
    {
      key: "clinic",
      header: t("platform.provisions.clinic", { defaultValue: "Clinic" }),
      render: (s) => (
        <div className="max-w-[14rem]">
          <p className="font-semibold">{s.clinicName || "—"}</p>
          <p className="text-xs text-neutral-500 truncate">
            {s.label || "—"} · {s.adminEmail || "—"}
          </p>
        </div>
      ),
    },
    {
      key: "paid",
      header: t("platform.provisions.payment", { defaultValue: "Payment" }),
      render: (s) => (
        <div className="space-y-1">
          <Badge tone={s.confirmedAt ? "ok" : "bad"}>
            {s.confirmedAt
              ? t("platform.provisions.confirmed", { defaultValue: "Confirmed" })
              : t("platform.provisions.unconfirmed", { defaultValue: "No webhook" })}
          </Badge>
          {!s.livemode && (
            <p className="text-xs text-neutral-500">
              {t("platform.provisions.testmode", { defaultValue: "Stripe test mode" })}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "outcome",
      header: t("platform.provisions.outcome", { defaultValue: "Outcome" }),
      render: (s) => (
        <div className="max-w-md space-y-1">
          <Badge tone={s.provisioned ? "ok" : s.provisionStarted ? "warn" : "bad"}>
            {s.provisioned
              ? t("platform.provisions.built", { defaultValue: "Clinic built" })
              : s.provisionStarted
                ? t("platform.provisions.attempted", { defaultValue: "Attempt in the table below" })
                : t("platform.provisions.never_started", { defaultValue: "Never started" })}
          </Badge>
          {/* The row this screen was built for: a sale we refused to build,
              recorded nowhere else. */}
          {s.blockedReason && (
            <p className="text-xs whitespace-pre-wrap break-words text-error-600 dark:text-error-400">
              {s.blockedReason === "payment_unconfirmed"
                ? t("platform.provisions.blocked_unconfirmed", {
                    defaultValue:
                      "Refused: the signup has no confirmedAt, so Stripe's checkout.session.completed never landed. Check the webhook endpoint and its signing secret for this mode.",
                  })
                : t("platform.provisions.blocked_missing", {
                    defaultValue: "Refused: there is no signup record for this reference at all.",
                  })}{" "}
              ({s.blockedAttempts}× · {when(s.blockedAt)})
            </p>
          )}
        </div>
      ),
    },
    {
      key: "created",
      header: t("platform.provisions.created", { defaultValue: "Signed up" }),
      render: (s) => <span className="text-xs text-neutral-500 whitespace-nowrap">{when(s.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-neutral-900 dark:text-white">
            {t("platform.provisions.signups_title", { defaultValue: "Signups" })}
          </h2>
          <p className="text-sm text-neutral-500">
            {t("platform.provisions.signups_hint", {
              defaultValue: "Every sale, and whether a clinic was ever attempted for it.",
            })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => load()}
          className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-xl text-sm font-semibold border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-200"
        >
          <RefreshCw className="w-4 h-4" />
          {t("platform.provisions.refresh", { defaultValue: "Refresh" })}
        </button>
      </div>

      <div>
        <DataTable
          rows={data.signups}
          getRowId={(s) => s.signupRef}
          columns={signupColumns}
          loading={loading}
          error={loadError}
          empty={t("platform.provisions.no_signups", { defaultValue: "No signups yet." })}
        />
        <Showing shown={data.signups.length} total={data.total?.signups} />
      </div>

      <div>
        <h2 className="font-bold text-neutral-900 dark:text-white">
          {t("platform.provisions.attempts_title", { defaultValue: "Provisioning attempts" })}
        </h2>
        <p className="text-sm text-neutral-500 mb-3">
          {t("platform.provisions.attempts_hint", {
            defaultValue:
              "Nothing is rolled back when a step fails. Fix the cause, then resume: the completed steps are skipped and the failed one is re-run.",
          })}
        </p>
        <DataTable
          rows={data.provisions}
          getRowId={(r) => r.provisionId}
          columns={provisionColumns}
          loading={loading}
          error={loadError}
          empty={t("platform.provisions.no_attempts", { defaultValue: "No provisioning attempts yet." })}
        />
        <Showing shown={data.provisions.length} total={data.total?.provisions} />
      </div>
    </div>
  );
}
