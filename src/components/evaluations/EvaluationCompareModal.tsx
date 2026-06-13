"use client";

import { ReactNode, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, GitCompareArrows } from "lucide-react";
import { EvalKind, toComparable, fmtValue } from "@/lib/evaluationComparison";
import EvaluationComparisonView from "./EvaluationComparisonView";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  kind: EvalKind;
  /** Completed evaluations of this kind (raw docs), any order. */
  evaluations: any[];
  childName?: string;
  /** Optional extra visual (e.g. ABLLS radar) given the two raw docs. */
  radar?: (currentRaw: any, previousRaw: any) => ReactNode;
}

export default function EvaluationCompareModal({ isOpen, onClose, kind, evaluations, childName, radar }: Props) {
  const { t } = useTranslation();

  // Newest first; pair each raw doc with its normalized comparable.
  const items = useMemo(() => {
    return [...evaluations]
      .map((raw) => ({ raw, cmp: toComparable(kind, raw) }))
      .sort((a, b) => new Date(b.cmp.rawDate).getTime() - new Date(a.cmp.rawDate).getTime());
  }, [evaluations, kind]);

  const [currentId, setCurrentId] = useState<string>(items[0]?.cmp.id ?? "");
  const [previousId, setPreviousId] = useState<string>(items[1]?.cmp.id ?? "");

  if (!isOpen) return null;

  const current = items.find((i) => i.cmp.id === currentId) ?? items[0];
  const previous = items.find((i) => i.cmp.id === previousId) ?? items[1];
  const canCompare = items.length >= 2 && current && previous && current.cmp.id !== previous.cmp.id;

  const optionLabel = (cmp: ReturnType<typeof toComparable>) =>
    `${cmp.dateLabel} · ${fmtValue(cmp.overallValue, cmp.unit)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <GitCompareArrows className="w-5 h-5 text-primary-500" />
            <div>
              <h3 className="font-bold text-neutral-900 dark:text-white">{t("evaluations.comparison.title")}</h3>
              {childName && <p className="text-xs text-neutral-500">{childName}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 min-w-11 min-h-11 flex items-center justify-center"
            aria-label={t("common.close", { defaultValue: "Close" })}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {items.length < 2 ? (
            <div className="text-center py-10 text-neutral-500">
              <GitCompareArrows className="w-10 h-10 mx-auto mb-3 text-neutral-300" />
              <p className="text-sm">{t("evaluations.comparison.need_two")}</p>
            </div>
          ) : (
            <>
              {/* Picker */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">{t("evaluations.comparison.choose_previous")}</label>
                  <select
                    value={previous?.cmp.id ?? ""}
                    onChange={(e) => setPreviousId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500"
                  >
                    {items.map(({ cmp }) => (
                      <option key={cmp.id} value={cmp.id} disabled={cmp.id === current?.cmp.id}>
                        {optionLabel(cmp)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-500 mb-1">{t("evaluations.comparison.choose_current")}</label>
                  <select
                    value={current?.cmp.id ?? ""}
                    onChange={(e) => setCurrentId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500"
                  >
                    {items.map(({ cmp }) => (
                      <option key={cmp.id} value={cmp.id} disabled={cmp.id === previous?.cmp.id}>
                        {optionLabel(cmp)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {canCompare && (
                <EvaluationComparisonView
                  current={current.cmp}
                  previous={previous.cmp}
                  extra={radar ? radar(current.raw, previous.raw) : undefined}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
