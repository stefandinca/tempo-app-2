"use client";

import { useState, useEffect } from "react";
import { clsx } from "clsx";
import { MessageSquare, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { ParsedSkillArea, VBMAPPItemScore, MilestoneScore } from "@/types/vbmapp";

interface VBMAPPMilestoneScoringProps {
  area: ParsedSkillArea;
  scores: Record<string, VBMAPPItemScore>;
  previousScores?: Record<string, VBMAPPItemScore>;
  onScoreChange: (itemId: string, score: MilestoneScore, note?: string, isNA?: boolean) => void;
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
  readOnly = false
}: VBMAPPMilestoneScoringProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [ceilingItemId, setCeilingItemId] = useState<string | null>(null);

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
            <p className="text-sm font-bold text-amber-800 dark:text-amber-400">Ceiling Reached</p>
            <p className="text-xs text-amber-700 dark:text-amber-500 mt-0.5">
              Three consecutive 0s detected. Clinical standard suggests stopping testing for this skill area.
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
                    {index + 1}
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
                        {comparison.diff > 0 ? "+" : ""}
                        {comparison.diff} from previous
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
                    placeholder="Add observation notes..."
                    disabled={readOnly}
                    className="w-full px-3 py-2 text-sm bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                    rows={2}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
