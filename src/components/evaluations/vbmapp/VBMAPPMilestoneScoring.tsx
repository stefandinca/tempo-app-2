"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { MessageSquare, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertCircle, ListChecks, Check } from "lucide-react";
import { ParsedSkillArea, VBMAPPItemScore, MilestoneScore } from "@/types/vbmapp";

interface VBMAPPMilestoneScoringProps {
  area: ParsedSkillArea;
  scores: Record<string, VBMAPPItemScore>;
  previousScores?: Record<string, VBMAPPItemScore>;
  onScoreChange: (itemId: string, score: MilestoneScore, note?: string, isNA?: boolean) => void;
  supportingSkillScores?: Record<string, boolean>;
  onSupportingSkillChange?: (supportingSkillId: string, checked: boolean) => void;
  readOnly?: boolean;
}

const SCORE_OPTIONS: { value: MilestoneScore; label: string; color: string; bgColor: string }[] = [
  { value: 0, label: "0", color: "text-white", bgColor: "bg-error-500" },
  { value: 0.5, label: "½", color: "text-white", bgColor: "bg-warning-500" },
  { value: 1, label: "1", color: "text-white", bgColor: "bg-success-500" }
];

export default function VBMAPPMilestoneScoring({
  area,
  scores,
  previousScores,
  onScoreChange,
  supportingSkillScores = {},
  onSupportingSkillChange,
  readOnly = false
}: VBMAPPMilestoneScoringProps) {
  const { t } = useTranslation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [expandedSkills, setExpandedSkills] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ceilingItemId, setCeilingItemId] = useState<string | null>(null);

  const toggleSkillsExpanded = (itemId: string) => {
    setExpandedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  // Ceiling Rule Logic: Stop testing when 3 consecutive 0s are achieved in a skill area
  useEffect(() => {
    let consecutiveZeros = 0;
    let foundCeilingId: string | null = null;

    for (let i = 0; i < area.items.length; i++) {
      const item = area.items[i];
      const scoreData = scores[item.id];
      const score = scoreData?.score;
      const isNA = scoreData?.isNA;

      if (score === 0 && !isNA) {
        consecutiveZeros++;
      } else if (score === 0.5 || score === 1) {
        consecutiveZeros = 0;
      }

      if (consecutiveZeros >= 3) {
        foundCeilingId = item.id;
        break;
      }
    }

    setCeilingItemId(foundCeilingId);
  }, [area.items, scores]);

  const toggleItemExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleNoteChange = (itemId: string, note: string) => {
    setNotes((prev) => ({ ...prev, [itemId]: note }));
  };

  const handleNoteSave = (itemId: string) => {
    const scoreData = scores[itemId];
    if (scoreData) {
      const note = notes[itemId] || scoreData.note;
      onScoreChange(itemId, scoreData.score as MilestoneScore, note, scoreData.isNA);
    }
  };

  const getScoreComparison = (itemId: string): { diff: number; trend: 'up' | 'down' | 'same' } | null => {
    if (!previousScores?.[itemId] || !scores[itemId]) return null;
    const prev = previousScores[itemId].score as number;
    const curr = scores[itemId].score as number;
    const diff = curr - prev;
    return {
      diff,
      trend: diff > 0 ? 'up' : diff < 0 ? 'down' : 'same'
    };
  };

  return (
    <div className="space-y-3">
      {/* Ceiling Warning */}
      {ceilingItemId && !readOnly && (
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">{t('ev_list.ceiling_reached', { defaultValue: 'Ceiling Reached' })}</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              {t('ev_list.ceiling_reached_desc', { defaultValue: 'Three consecutive 0s detected. Clinical standard suggests stopping testing for this skill area.' })}
            </p>
          </div>
        </div>
      )}

      {area.items.map((item, index) => {
        const itemScore = scores[item.id];
        const currentScore = itemScore?.score;
        const isNA = itemScore?.isNA;
        const isExpanded = expandedItems.has(item.id);
        const comparison = getScoreComparison(item.id);
        const noteValue = notes[item.id] ?? itemScore?.note ?? "";
        
        // Find if this item is after the ceiling
        const itemIndex = area.items.findIndex(i => i.id === item.id);
        const ceilingIndex = ceilingItemId ? area.items.findIndex(i => i.id === ceilingItemId) : Infinity;
        const isPastCeiling = itemIndex > ceilingIndex;

        return (
          <div
            key={item.id}
            className={clsx(
              "rounded-xl border transition-all",
              isNA
                ? "bg-neutral-100 dark:bg-neutral-800/20 border-dashed border-neutral-300 opacity-75"
                : currentScore !== undefined
                ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
                : isPastCeiling
                ? "bg-neutral-100/50 dark:bg-neutral-800/20 border-dashed border-neutral-200 dark:border-neutral-800 opacity-60"
                : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800"
            )}
          >
            <div className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start">
                {/* Item number and milestone age */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-neutral-400">
                    {item.mNum ?? index + 1}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
                    {item.months}mo
                  </span>
                </div>

                {/* Item text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {item.text}
                  </p>

                  {/* Examiner guidance from the official sheet */}
                  {item.guidance && (
                    <p className="mt-1 text-xs italic text-neutral-400 dark:text-neutral-500 leading-relaxed">
                      {item.guidance}
                    </p>
                  )}

                  {/* Comparison indicator */}
                  {comparison && !isNA && (
                    <div className="mt-2 flex items-center gap-1">
                      {comparison.trend === 'up' ? (
                        <TrendingUp className="w-3 h-3 text-success-500" />
                      ) : comparison.trend === 'down' ? (
                        <TrendingDown className="w-3 h-3 text-error-500" />
                      ) : (
                        <Minus className="w-3 h-3 text-neutral-400" />
                      )}
                      <span
                        className={clsx(
                          "text-xs",
                          comparison.trend === 'up'
                            ? "text-success-600"
                            : comparison.trend === 'down'
                            ? "text-error-600"
                            : "text-neutral-500"
                        )}
                      >
                        {t('ev_list.diff_from_previous', { defaultValue: '{{diff}} from previous', diff: `${comparison.diff > 0 ? "+" : ""}${comparison.diff}` })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Score buttons - responsive layout */}
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-1">
                  <div className="flex items-center gap-1">
                  {/* N/A Button */}
                  <button
                    onClick={() => !readOnly && onScoreChange(item.id, 0, itemScore?.note, !isNA)}
                    disabled={readOnly}
                    className={clsx(
                      "px-2 h-9 rounded-lg font-bold text-[10px] transition-all",
                      isNA
                        ? "bg-neutral-500 text-white shadow-lg"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200"
                    )}
                  >
                    N/A
                  </button>

                  {SCORE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => !readOnly && onScoreChange(item.id, option.value, noteValue || undefined, false)}
                      disabled={readOnly}
                      className={clsx(
                        "w-9 h-9 rounded-lg font-bold text-sm transition-all",
                        currentScore === option.value && !isNA
                          ? `${option.bgColor} ${option.color} ring-2 ring-offset-2`
                          : readOnly
                          ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                  </div>

                  {/* Note toggle */}
                  <button
                    onClick={() => toggleItemExpanded(item.id)}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      isExpanded || itemScore?.note
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Expanded note section */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <textarea
                    value={noteValue}
                    onChange={(e) => handleNoteChange(item.id, e.target.value)}
                    onBlur={() => handleNoteSave(item.id)}
                    placeholder={t('ev_list.add_observation_notes', { defaultValue: 'Add observation notes...' })}
                    disabled={readOnly}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    rows={2}
                  />
                </div>
              )}

              {/* Supporting skills (task-analysis checkboxes) */}
              {item.supportingSkills && item.supportingSkills.length > 0 && (() => {
                const skills = item.supportingSkills;
                const doneCount = skills.filter((s) => supportingSkillScores[s.id]).length;
                const skillsOpen = expandedSkills.has(item.id);
                return (
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                    <button
                      type="button"
                      onClick={() => toggleSkillsExpanded(item.id)}
                      className="flex items-center gap-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 transition-colors min-h-11"
                    >
                      <ListChecks className="w-4 h-4 text-primary-500" />
                      <span>
                        {t("vbmapp.supporting_skills")} ({doneCount}/{skills.length})
                      </span>
                      {skillsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {skillsOpen && (
                      <div className="mt-1 space-y-0.5">
                        {skills.map((skill) => {
                          const checked = !!supportingSkillScores[skill.id];
                          return (
                            <button
                              key={skill.id}
                              type="button"
                              onClick={() => !readOnly && onSupportingSkillChange?.(skill.id, !checked)}
                              disabled={readOnly}
                              className={clsx(
                                "w-full flex items-start gap-2.5 text-left px-2 py-2 rounded-lg min-h-11 transition-colors",
                                readOnly ? "cursor-default" : "hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                              )}
                            >
                              <span
                                className={clsx(
                                  "mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                                  checked
                                    ? "bg-success-500 border-success-500 text-white"
                                    : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900"
                                )}
                              >
                                {checked && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                              </span>
                              <span className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                                <span className="font-bold text-neutral-500 dark:text-neutral-300 mr-1">{skill.label}.</span>
                                {skill.text}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })}
    </div>
  );
}
