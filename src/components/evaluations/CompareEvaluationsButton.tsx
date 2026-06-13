"use client";

import { ReactNode, useState } from "react";
import { clsx } from "clsx";
import { GitCompareArrows } from "lucide-react";
import { useTranslation } from "react-i18next";
import { EvalKind } from "@/lib/evaluationComparison";
import EvaluationCompareModal from "./EvaluationCompareModal";

interface Props {
  kind: EvalKind;
  /** Completed evaluations of this kind (raw docs). */
  evaluations: any[];
  childName?: string;
  /** Optional extra visual (e.g. ABLLS radar) given the two raw docs. */
  radar?: (currentRaw: any, previousRaw: any) => ReactNode;
  className?: string;
}

/** A "Compare" pill that opens the evaluation-comparison modal. Renders nothing
 *  unless at least two completed evaluations exist. Drop into any list header. */
export default function CompareEvaluationsButton({ kind, evaluations, childName, radar, className }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!evaluations || evaluations.length < 2) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={clsx(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold",
          "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400",
          "hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors",
          className
        )}
      >
        <GitCompareArrows className="w-4 h-4" />
        {t("evaluations.comparison.title")}
      </button>
      <EvaluationCompareModal
        isOpen={open}
        onClose={() => setOpen(false)}
        kind={kind}
        evaluations={evaluations}
        childName={childName}
        radar={radar}
      />
    </>
  );
}
