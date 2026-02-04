"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { AlertTriangle, MessageSquare } from "lucide-react";
import { VBMAPPBarrierItem, VBMAPPItemScore, BarrierScore } from "@/types/vbmapp";

interface VBMAPPBarrierScoringProps {
  barriers: VBMAPPBarrierItem[];
  scores: Record<string, VBMAPPItemScore>;
  onScoreChange: (itemId: string, score: BarrierScore, note?: string) => void;
  readOnly?: boolean;
}

const BARRIER_SCORES: { value: BarrierScore; label: string; description: string; color: string }[] = [
  { value: 0, label: "0", description: "Not a barrier", color: "bg-success-500" },
  { value: 1, label: "1", description: "Minor barrier", color: "bg-success-400" },
  { value: 2, label: "2", description: "Moderate barrier", color: "bg-warning-400" },
  { value: 3, label: "3", description: "Significant barrier", color: "bg-warning-500" },
  { value: 4, label: "4", description: "Severe barrier", color: "bg-error-500" }
];

export default function VBMAPPBarrierScoring({
  barriers,
  scores,
  onScoreChange,
  readOnly = false
}: VBMAPPBarrierScoringProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});

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
    const currentScore = scores[itemId]?.score as BarrierScore;
    if (currentScore !== undefined) {
      const note = notes[itemId] || scores[itemId]?.note;
      onScoreChange(itemId, currentScore, note);
    }
  };

  const getSeverityColor = (score: BarrierScore | undefined) => {
    if (score === undefined) return "bg-neutral-200 dark:bg-neutral-700";
    return BARRIER_SCORES.find((s) => s.value === score)?.color || "bg-neutral-200";
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3">
          Rate each barrier from 0 (not present) to 4 (severe):
        </p>
        <div className="flex flex-wrap gap-3">
          {BARRIER_SCORES.map((score) => (
            <div key={score.value} className="flex items-center gap-2">
              <span className={clsx("w-6 h-6 rounded text-white text-xs font-bold flex items-center justify-center", score.color)}>
                {score.value}
              </span>
              <span className="text-xs text-neutral-500">{score.description}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Barrier items */}
      <div className="space-y-3">
        {barriers.map((barrier, index) => {
          const currentScore = scores[barrier.id];
          const isExpanded = expandedItems.has(barrier.id);
          const noteValue = notes[barrier.id] ?? currentScore?.note ?? "";
          const isSevere = currentScore && (currentScore.score as number) >= 3;

          return (
            <div
              key={barrier.id}
              className={clsx(
                "rounded-xl border transition-all",
                isSevere
                  ? "bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800"
                  : currentScore !== undefined
                  ? "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700"
                  : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800"
              )}
            >
              <div className="p-4">
                <div className="flex items-start gap-4">
                  {/* Severity indicator */}
                  <div className={clsx("w-2 h-full min-h-[40px] rounded-full", getSeverityColor(currentScore?.score as BarrierScore))} />

                  {/* Barrier number */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-400">
                      B{index + 1}
                    </span>
                    {isSevere && <AlertTriangle className="w-4 h-4 text-error-500" />}
                  </div>

                  {/* Barrier text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                      {barrier.text}
                    </p>
                  </div>

                  {/* Score buttons */}
                  <div className="flex items-center gap-1">
                    {BARRIER_SCORES.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => !readOnly && onScoreChange(barrier.id, option.value, noteValue || undefined)}
                        disabled={readOnly}
                        className={clsx(
                          "w-8 h-8 rounded-lg font-bold text-xs transition-all",
                          currentScore?.score === option.value
                            ? `${option.color} text-white ring-2 ring-offset-2`
                            : readOnly
                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-400"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        )}
                      >
                        {option.value}
                      </button>
                    ))}
                  </div>

                  {/* Note toggle */}
                  <button
                    onClick={() => toggleItemExpanded(barrier.id)}
                    className={clsx(
                      "p-2 rounded-lg transition-colors",
                      isExpanded || currentScore?.note
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
                        : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
                    )}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded note section */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700 ml-6">
                    <textarea
                      value={noteValue}
                      onChange={(e) => handleNoteChange(barrier.id, e.target.value)}
                      onBlur={() => handleNoteSave(barrier.id)}
                      placeholder="Add observation notes about this barrier..."
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
    </div>
  );
}
