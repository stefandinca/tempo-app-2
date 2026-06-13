"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Loader2, RefreshCw, Target, Star, Lightbulb } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db, IS_DEMO } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { EvalKind } from "@/lib/evaluationComparison";
import { buildEvaluationContext } from "@/lib/assistant/context";
import { requestInsights, AssistantError } from "@/lib/assistant/clientApi";
import { useAiConsent } from "@/hooks/useAiConsent";
import AiConsentModal from "@/components/assistant/AiConsentModal";
import type { AiInsights as AiInsightsData } from "@/types/aiInsights";

const SUBCOLLECTION: Record<EvalKind, string> = {
  ablls: "evaluations",
  vbmapp: "vbmapp_evaluations",
  portage: "portage_evaluations",
  cars: "cars_evaluations",
  carolina: "carolina_evaluations",
};

interface Props {
  kind: EvalKind;
  clientId: string;
  evaluation: any; // raw eval doc (may carry .aiInsights)
  client?: any;
  /** Hide the generate/regenerate controls (e.g. read-only contexts). */
  readOnly?: boolean;
}

export default function AiInsights({ kind, clientId, evaluation, client, readOnly }: Props) {
  const { t, i18n } = useTranslation();
  const { userData } = useAuth();
  const { success, error: toastError } = useToast();
  const { consented } = useAiConsent();
  const [consentOpen, setConsentOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<AiInsightsData | undefined>(evaluation?.aiInsights);

  const lang = i18n.language.startsWith("ro") ? "ro" : "en";

  const generate = async () => {
    if (!evaluation?.id) return;
    setLoading(true);
    try {
      const context = buildEvaluationContext(kind, evaluation, client);
      const { insights: result, model } = await requestInsights({ kind, clientId, context, language: lang });
      const data: AiInsightsData = {
        ...result,
        model,
        generatedAt: new Date().toISOString(),
        generatedByName: userData?.name || undefined,
      };
      await updateDoc(doc(db, "clients", clientId, SUBCOLLECTION[kind], evaluation.id), { aiInsights: data });
      setInsights(data);
      success(t("assistant.insights.generated", { defaultValue: "AI insights generated" }));
    } catch (err) {
      const status = err instanceof AssistantError ? err.status : 0;
      if (status === 503) toastError(t("assistant.unavailable", { defaultValue: "This feature is only available in the full release." }));
      else if (status === 403) toastError(t("assistant.insights.consent_needed", { defaultValue: "AI consent is required" }));
      else if (status === 429) toastError(t("assistant.insights.rate_limited", { defaultValue: "Daily AI limit reached" }));
      else toastError(t("assistant.insights.failed", { defaultValue: "Could not generate insights" }));
    } finally {
      setLoading(false);
    }
  };

  const trigger = () => {
    // Demo build ships without an API key — show the upsell instead of calling out.
    if (IS_DEMO) {
      toastError(t("assistant.unavailable", { defaultValue: "This feature is only available in the full release." }));
      return;
    }
    if (consented) generate();
    else setConsentOpen(true);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === "ro" ? "ro-RO" : "en-US", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="rounded-2xl border border-primary-200 dark:border-primary-900/40 bg-primary-50/50 dark:bg-primary-900/10 p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h4 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-500" />
          {t("assistant.insights.title", { defaultValue: "AI insights" })}
        </h4>
        {!readOnly && (
          <button
            onClick={trigger}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white transition-colors disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : insights ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {insights
              ? t("assistant.insights.regenerate", { defaultValue: "Regenerate" })
              : t("assistant.insights.generate", { defaultValue: "Generate" })}
          </button>
        )}
      </div>

      {!insights ? (
        <p className="text-sm text-neutral-500">
          {readOnly
            ? t("assistant.insights.none", { defaultValue: "No AI insights yet." })
            : t("assistant.insights.cta", { defaultValue: "Generate clinical observations and focus areas from these scores." })}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{insights.summary}</p>

          {insights.focusAreas.length > 0 && (
            <Section icon={<Target className="w-4 h-4 text-error-500" />} title={t("assistant.insights.focus", { defaultValue: "Where to focus" })} items={insights.focusAreas} />
          )}
          {insights.strengths.length > 0 && (
            <Section icon={<Star className="w-4 h-4 text-success-500" />} title={t("assistant.insights.strengths", { defaultValue: "Strengths" })} items={insights.strengths} />
          )}
          {insights.observations.length > 0 && (
            <Section icon={<Lightbulb className="w-4 h-4 text-warning-500" />} title={t("assistant.insights.observations", { defaultValue: "Observations" })} items={insights.observations} />
          )}

          <p className="text-[11px] text-neutral-400 pt-1">
            {t("assistant.insights.meta", { defaultValue: "AI-generated; review before clinical use." })}
            {" · "}
            {formatDate(insights.generatedAt)}
            {insights.generatedByName ? ` · ${insights.generatedByName}` : ""}
          </p>
        </div>
      )}

      <AiConsentModal isOpen={consentOpen} onClose={() => setConsentOpen(false)} onGranted={() => { setConsentOpen(false); generate(); }} />
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
        {icon}
        {title}
      </p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-neutral-700 dark:text-neutral-300 flex gap-2">
            <span className="text-neutral-300 mt-1.5 w-1 h-1 rounded-full bg-current shrink-0" />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
