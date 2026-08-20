"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useConfirm } from "@/context/ConfirmContext";
import { platformPut } from "@/lib/platform/clientApi";

export interface LicenceValue {
  plan: string;
  expiresAt: string | null;
  graceDays: number;
  notes: string;
}

/**
 * The licence form.
 *
 * An expiry date is only meaningful on a term licence, so the date and grace
 * inputs disappear for a lifetime one rather than sitting there disabled and
 * inviting the question of whether they still apply.
 *
 * A past expiry date is a legitimate way to force an immediate freeze, but a
 * mistyped year reads identically to that intent at the API layer — the
 * mirror enforces it the moment it lands, and that clinic's staff go
 * read-only right away. So a term licence whose chosen expiry is already in
 * the past requires an explicit confirmation naming that consequence before
 * it saves; a future expiry saves without ceremony.
 */
export default function LicenceEditor({
  tenantId,
  value,
  onSaved,
}: {
  tenantId: string;
  value: LicenceValue | null;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();
  const [plan, setPlan] = useState(value?.plan === "lifetime" ? "lifetime" : "term");
  const [expiresAt, setExpiresAt] = useState((value?.expiresAt || "").slice(0, 10));
  const [graceDays, setGraceDays] = useState(String(value?.graceDays ?? 14));
  const [notes, setNotes] = useState(value?.notes || "");
  const [saving, setSaving] = useState(false);

  async function doSave() {
    setSaving(true);
    try {
      await platformPut<{ mirrored: boolean }>(`/api/platform/clinics/${tenantId}/licence`, {
        plan,
        expiresAt: plan === "term" && expiresAt ? new Date(expiresAt).toISOString() : null,
        graceDays: Number(graceDays),
        notes,
      }).then((r) => {
        if (!r.mirrored) {
          // Saved, but the rules are not enforcing it yet. Say so — a licence
          // that looks set and is not enforced is the worst of both.
          toastError(
            t("platform.licence.not_mirrored", {
              defaultValue: "Saved, but not yet enforced on the clinic. Check Health.",
            }),
          );
        } else {
          success(t("platform.licence.saved", { defaultValue: "Licence saved." }));
        }
      });
      onSaved();
    } catch {
      toastError(t("platform.licence.save_failed", { defaultValue: "Could not save the licence." }));
    } finally {
      setSaving(false);
    }
  }

  function save() {
    const isPast = plan === "term" && !!expiresAt && new Date(expiresAt).getTime() < Date.now();
    if (isPast) {
      confirm({
        title: t("platform.licence.past_expiry_title", { defaultValue: "Expiry date is in the past" }),
        message: t("platform.licence.past_expiry_message", {
          defaultValue:
            "Staff at this clinic will become read-only as soon as this saves. Continue?",
        }),
        confirmLabel: t("platform.licence.past_expiry_confirm", { defaultValue: "Save anyway" }),
        variant: "danger",
        onConfirm: () => { void doSave(); },
      });
      return;
    }
    void doSave();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["term", "lifetime"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPlan(p)}
            className={
              plan === p
                ? "px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-primary-500 text-white"
                : "px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
            }
          >
            {t(`platform.licence.plan_${p}`, { defaultValue: p === "term" ? "Term" : "Lifetime" })}
          </button>
        ))}
      </div>

      {plan === "term" && (
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="block text-xs text-neutral-500 mb-1">
              {t("platform.licence.expires", { defaultValue: "Expires" })}
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="px-3 py-2 min-h-[44px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            />
          </label>
          <label className="text-sm">
            <span className="block text-xs text-neutral-500 mb-1">
              {t("platform.licence.grace", { defaultValue: "Grace (days)" })}
            </span>
            <input
              type="number"
              min={0}
              value={graceDays}
              onChange={(e) => setGraceDays(e.target.value)}
              className="w-24 px-3 py-2 min-h-[44px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
            />
          </label>
        </div>
      )}

      <label className="block text-sm">
        <span className="block text-xs text-neutral-500 mb-1">
          {t("platform.licence.notes", { defaultValue: "Notes" })}
        </span>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full px-3 py-2 min-h-[44px] rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900"
        />
      </label>

      <button
        onClick={save}
        disabled={saving || (plan === "term" && !expiresAt)}
        className="px-4 py-2 min-h-[44px] rounded-lg text-sm font-semibold bg-primary-500 text-white disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
      >
        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        {t("platform.licence.save", { defaultValue: "Save licence" })}
      </button>
    </div>
  );
}
