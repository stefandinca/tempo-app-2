"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { MessageSquare, X, Check } from "lucide-react";
import { ABLLSCategory, ItemScore, ScoreValue, SCORE_LABELS } from "@/types/evaluation";

interface CategoryScoringProps {
  category: ABLLSCategory;
  scores: Record<string, ItemScore>;
  previousScores?: Record<string, ItemScore>;
  onScoreChange: (itemId: string, score: ScoreValue, note?: string) => void;
  readOnly?: boolean;
}

export default function CategoryScoring({
  category,
  scores,
  previousScores,
  onScoreChange,
  readOnly = false
}: CategoryScoringProps) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const handleNoteClick = (itemId: string) => {
    if (readOnly) return;
    const currentNote = scores[itemId]?.note || "";
    setNoteText(currentNote);
    setExpandedNote(expandedNote === itemId ? null : itemId);
  };

  const saveNote = (itemId: string) => {
    const currentScore = scores[itemId]?.score ?? 0;
    onScoreChange(itemId, currentScore, noteText || undefined);
    setExpandedNote(null);
  };

  const getScoreChange = (itemId: string): 'improved' | 'regressed' | 'same' | null => {
    if (!previousScores || !previousScores[itemId] || !scores[itemId]) return null;
    const prev = previousScores[itemId].score;
    const curr = scores[itemId].score;
    if (curr > prev) return 'improved';
    if (curr < prev) return 'regressed';
    return 'same';
  };

  return (
    <div className="space-y-3">
      {category.items.map((item) => {
        const currentScore = scores[item.id]?.score;
        const hasNote = !!scores[item.id]?.note;
        const previousScore = previousScores?.[item.id]?.score;
        const change = getScoreChange(item.id);

        return (
          <div
            key={item.id}
            className={clsx(
              "p-4 rounded-xl border transition-all",
              currentScore !== undefined
                ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700"
                : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800"
            )}
          >
            <div className="flex items-start gap-4">
              {/* Item ID badge */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {item.id}
                </span>
              </div>

              {/* Item content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                  {item.text}
                </p>

                {/* Score buttons */}
                <div className="flex items-center gap-2">
                  {([0, 1, 2] as ScoreValue[]).map((scoreValue) => {
                    const isSelected = currentScore === scoreValue;
                    const scoreInfo = SCORE_LABELS[scoreValue];

                    return (
                      <button
                        key={scoreValue}
                        onClick={() => !readOnly && onScoreChange(item.id, scoreValue, scores[item.id]?.note)}
                        disabled={readOnly}
                        title={scoreInfo.description}
                        className={clsx(
                          "w-10 h-10 rounded-lg font-bold text-sm transition-all",
                          readOnly && "cursor-default",
                          isSelected
                            ? scoreInfo.color === 'error'
                              ? "bg-error-500 text-white shadow-lg shadow-error-500/30"
                              : scoreInfo.color === 'warning'
                              ? "bg-warning-500 text-white shadow-lg shadow-warning-500/30"
                              : "bg-success-500 text-white shadow-lg shadow-success-500/30"
                            : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        )}
                      >
                        {scoreValue}
                      </button>
                    );
                  })}

                  {/* Note button */}
                  {!readOnly && (
                    <button
                      onClick={() => handleNoteClick(item.id)}
                      className={clsx(
                        "p-2 rounded-lg transition-colors ml-2",
                        hasNote
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
                          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:text-neutral-600"
                      )}
                      title={hasNote ? "Edit note" : "Add note"}
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                  )}

                  {/* Previous score indicator */}
                  {previousScore !== undefined && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Previous:</span>
                      <span className={clsx(
                        "text-xs font-medium px-2 py-0.5 rounded",
                        previousScore === 0 && "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
                        previousScore === 1 && "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400",
                        previousScore === 2 && "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
                      )}>
                        {previousScore}
                      </span>
                      {change && change !== 'same' && (
                        <span className={clsx(
                          "text-xs font-medium",
                          change === 'improved' && "text-success-600",
                          change === 'regressed' && "text-error-600"
                        )}>
                          {change === 'improved' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Read-only note indicator */}
                  {readOnly && hasNote && (
                    <div className="ml-auto">
                      <MessageSquare className="w-4 h-4 text-primary-500" />
                    </div>
                  )}
                </div>

                {/* Note input (expanded) */}
                {expandedNote === item.id && (
                  <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Add a note about this score..."
                      className="w-full px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setExpandedNote(null)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveNote(item.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Save Note
                      </button>
                    </div>
                  </div>
                )}

                {/* Existing note display (read-only or collapsed) */}
                {hasNote && expandedNote !== item.id && (
                  <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                    <p className="text-xs text-primary-700 dark:text-primary-300 italic">
                      {scores[item.id].note}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
