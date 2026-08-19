"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { doc, onSnapshot, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { logActivity } from "@/lib/activityService";
import { Loader2, ClipboardList, Check, X } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

/**
 * Superadmin-only: which evaluation protocols this CLINIC has access to.
 *
 * The gate is per clinic, not per child. A clinic buys TempoApp with a certain
 * set of protocols; deciding that ABLLS-R is included and CARS is not is a
 * commercial decision about the customer, and it would make no sense for one
 * child at a clinic to have CARS while their sibling does not.
 *
 * Disabling a protocol hides it from every other role, and the matching
 * Firestore rules deny reads of those subcollections, so this is real access
 * control rather than a UI preference.
 *
 * Stored as an OPT-OUT list in `system_settings/evaluation_access`, so a clinic
 * with no document has everything enabled. An allowlist would have switched
 * every protocol off for every clinic the moment the rules deployed.
 */

export const EVALUATION_ACCESS_DOC = "evaluation_access";

export const EVALUATION_KINDS = [
  { id: "ablls", name: "ABLLS-R" },
  { id: "vbmapp", name: "VB-MAPP" },
  { id: "portage", name: "Portage" },
  { id: "cars", name: "CARS" },
  { id: "carolina", name: "Carolina" },
] as const;

export type EvaluationKind = (typeof EVALUATION_KINDS)[number]["id"];

/** True when `kind` is available at this clinic. Absent list = all enabled. */
export function isEvaluationEnabled(disabled: string[] | undefined | null, kind: string): boolean {
  return !Array.isArray(disabled) || !disabled.includes(kind);
}

export interface EvaluationAccess {
  disabled: string[];
  loading: boolean;
  /** True when the clinic has no protocol at all — the tab shows "coming soon". */
  allDisabled: boolean;
}

/**
 * Live view of the clinic's protocol access. Every consumer subscribes rather
 * than reading once, so a Superadmin toggling a protocol takes effect in an
 * open session instead of at the next reload.
 */
export function useEvaluationAccess(): EvaluationAccess {
  const [disabled, setDisabled] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "system_settings", EVALUATION_ACCESS_DOC),
      (snap) => {
        const list = snap.exists() ? snap.data()?.disabled : undefined;
        setDisabled(Array.isArray(list) ? list : []);
        setLoading(false);
      },
      (err) => {
        // Fail OPEN on a read error: a clinic seeing a protocol it should not
        // have is a billing question, but hiding every protocol because a read
        // blipped would look like the product broke.
        console.error("[EvaluationAccess] read failed:", err);
        setDisabled([]);
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  return {
    disabled,
    loading,
    allDisabled: EVALUATION_KINDS.every((k) => disabled.includes(k.id)),
  };
}

export default function EvaluationAccessTab() {
  const { t } = useTranslation();
  const { user, userData } = useAuth();
  const { success, error } = useToast();
  const { disabled, loading } = useEvaluationAccess();
  const [savingKind, setSavingKind] = useState<string | null>(null);

  const toggle = async (kind: EvaluationKind) => {
    setSavingKind(kind);
    const currentlyEnabled = isEvaluationEnabled(disabled, kind);
    const next = currentlyEnabled
      ? Array.from(new Set([...disabled, kind]))
      : disabled.filter((k) => k !== kind);

    try {
      // setDoc with merge: the document does not exist until the first change,
      // which is what keeps "no document" meaning "everything enabled".
      await setDoc(
        doc(db, "system_settings", EVALUATION_ACCESS_DOC),
        { disabled: next, updatedAt: serverTimestamp(), updatedBy: user?.uid || "" },
        { merge: true },
      );

      if (user && userData) {
        // Non-blocking, per the project convention that every mutation is logged.
        logActivity({
          // Categorised under evaluations, which is what this changes.
          type: "evaluation_updated",
          userId: user.uid,
          userName: userData.name || user.email || "Unknown",
          userPhotoURL: userData.photoURL || undefined,
          targetId: EVALUATION_ACCESS_DOC,
          targetName: kind,
          metadata: { evaluationKind: kind, enabled: !currentlyEnabled },
        }).catch((err) => console.error("Failed to log evaluation access change:", err));
      }

      success(t("settings.evaluation_access.saved"));
    } catch (err) {
      console.error(err);
      error(t("settings.evaluation_access.save_error"));
    } finally {
      setSavingKind(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-600 flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t("settings.evaluation_access.title")}
          </h3>
          <p className="text-sm text-neutral-500">{t("settings.evaluation_access.subtitle")}</p>
        </div>
      </div>

      <div className="bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl p-3">
        <p className="text-sm text-warning-800 dark:text-warning-200">
          {t("settings.evaluation_access.warning")}
        </p>
      </div>

      <div className="space-y-2">
        {EVALUATION_KINDS.map((k) => {
          const enabled = isEvaluationEnabled(disabled, k.id);
          const busy = savingKind === k.id;
          return (
            <div
              key={k.id}
              className="flex items-center justify-between gap-4 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
            >
              <div className="min-w-0">
                <p className="font-semibold text-neutral-900 dark:text-white">{k.name}</p>
                <p className="text-sm text-neutral-500">
                  {enabled
                    ? t("settings.evaluation_access.enabled_hint")
                    : t("settings.evaluation_access.disabled_hint")}
                </p>
              </div>
              <button
                onClick={() => !busy && toggle(k.id)}
                disabled={busy}
                aria-pressed={enabled}
                aria-label={k.name}
                title={
                  enabled
                    ? t("settings.evaluation_access.click_to_disable")
                    : t("settings.evaluation_access.click_to_enable")
                }
                className={clsx(
                  "w-11 h-11 rounded-xl inline-flex items-center justify-center transition-colors shrink-0",
                  busy && "opacity-50 cursor-wait",
                  enabled
                    ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400 hover:bg-success-200"
                    : "bg-neutral-100 text-neutral-400 dark:bg-neutral-800 hover:bg-neutral-200",
                )}
              >
                {busy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : enabled ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <X className="w-5 h-5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
