"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { MessageSquare, Check, ChevronDown, ChevronUp } from "lucide-react";
import { AbllsCategory } from "@/data/ablls-r-protocol";
import { ItemScore, SCORE_LABELS } from "@/types/evaluation";
import { Lightbulb } from "lucide-react";

interface CategoryScoringProps {
  category: AbllsCategory;
  scores: Record<string, ItemScore>;
  previousScores?: Record<string, ItemScore>;
  onScoreChange: (itemId: string, score: number, note?: string, isNA?: boolean) => void;
  readOnly?: boolean;
  clientAgeYears?: number;
}

export default function CategoryScoring({
  category,
  scores,
  previousScores,
  onScoreChange,
  readOnly = false,
  clientAgeYears
}: CategoryScoringProps) {
  const [expandedNote, setExpandedNote] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  const handleNoteClick = (itemId: string) => {
    if (readOnly) return;
    const currentNote = scores[itemId]?.note || "";
    setNoteText(currentNote);
    setExpandedNote(expandedNote === itemId ? null : itemId);
  };

  const toggleDetails = (itemId: string) => {
    setExpandedDetails(expandedDetails === itemId ? null : itemId);
  };

  const saveNote = (itemId: string) => {
    const currentScore = scores[itemId]?.score ?? 0;
    const isNA = scores[itemId]?.isNA ?? false;
    onScoreChange(itemId, currentScore, noteText || undefined, isNA);
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
        const itemScore = scores[item.id];
        const currentScore = itemScore?.score;
        const isNA = itemScore?.isNA;
        const hasNote = !!itemScore?.note;
        const previousScore = previousScores?.[item.id]?.score;
        const change = getScoreChange(item.id);
        const isDetailsExpanded = expandedDetails === item.id;

        return (
          <div
            key={item.id}
            className={clsx(
              "p-4 rounded-xl border transition-all",
              isNA 
                ? "bg-neutral-100 dark:bg-neutral-800/20 border-dashed border-neutral-300 opacity-75"
                : currentScore !== undefined
                ? "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-700 shadow-sm"
                : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800"
            )}
          >
            <div className="flex items-start gap-4">
              {/* Item ID badge */}
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                   onClick={() => toggleDetails(item.id)}>
                <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                  {item.id}
                </span>
              </div>

              {/* Item content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 dark:text-white leading-relaxed whitespace-normal">
                      {item.text}
                    </p>
                    {clientAgeYears !== undefined && clientAgeYears < 5 && ["P", "Q", "R", "S"].includes(category.id) && (
                      <span className="flex-shrink-0" title="Acest item depășește de obicei vârsta de dezvoltare de 5 ani.">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" />
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => toggleDetails(item.id)}
                    className="p-1 text-neutral-400 hover:text-primary-500 transition-colors"
                  >
                    {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Protocol Details (Collapsible) */}
                {isDetailsExpanded && (
                  <div className="mb-4 p-3 bg-neutral-100 dark:bg-neutral-800/50 rounded-lg text-xs space-y-2 border border-neutral-200 dark:border-neutral-700 animate-in fade-in duration-200">
                    {item.objective && (
                      <div>
                        <span className="font-bold text-neutral-500 uppercase tracking-wider">Obiectiv:</span>
                        <p className="text-neutral-700 dark:text-neutral-300 mt-0.5">{item.objective}</p>
                      </div>
                    )}
                    {item.sd && (
                      <div>
                        <span className="font-bold text-neutral-500 uppercase tracking-wider">SD:</span>
                        <p className="text-neutral-700 dark:text-neutral-300 mt-0.5 italic">&quot;{item.sd}&quot;</p>
                      </div>
                    )}
                    <div>
                      <span className="font-bold text-neutral-500 uppercase tracking-wider">Criterii:</span>
                      <ul className="mt-1 space-y-1">
                        {item.criteria.map((c) => (
                          <li key={c.score} className="flex gap-2">
                            <span className="font-bold text-primary-600">{c.score}:</span>
                            <span className="text-neutral-600 dark:text-neutral-400">{c.text}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* Score buttons - Responsive layout: vertical stack on mobile, horizontal on desktop */}
                <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:gap-2">
                  {/* Scoring buttons group */}
                  <div className="flex flex-wrap items-center gap-2">
                  {/* N/A Button */}
                  <button
                    onClick={() => !readOnly && onScoreChange(item.id, 0, itemScore?.note, !isNA)}
                    disabled={readOnly}
                    title="Nu se aplică"
                    className={clsx(
                      "px-3 h-10 rounded-lg font-bold text-xs transition-all",
                      isNA
                        ? "bg-neutral-500 text-white shadow-lg"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    )}
                  >
                    N/A
                  </button>

                  {/* Dynamic buttons 0 to maxScore */}
                  {Array.from({ length: item.maxScore + 1 }).map((_, i) => {
                    const scoreValue = i;
                    const isSelected = currentScore === scoreValue && !isNA;
                    const scoreInfo = SCORE_LABELS[scoreValue] || SCORE_LABELS[scoreValue > 2 ? 4 : scoreValue];
                    
                    // Specific criteria description for tooltip
                    const criteriaDesc = item.criteria.find(c => c.score === scoreValue)?.text || scoreInfo.description;

                    return (
                      <button
                        key={scoreValue}
                        onClick={() => !readOnly && onScoreChange(item.id, scoreValue, itemScore?.note, false)}
                        disabled={readOnly}
                        title={criteriaDesc}
                        className={clsx(
                          "w-10 h-10 rounded-lg font-bold text-sm transition-all",
                          readOnly && "cursor-default",
                          isSelected
                            ? scoreValue === 0
                              ? "bg-error-500 text-white shadow-lg shadow-error-500/30"
                              : scoreValue < item.maxScore
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
                  </div>

                  {/* Previous score indicator */}
                  {previousScore !== undefined && (
                    <div className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-neutral-400">Anterior:</span>
                      <span className={clsx(
                        "text-xs font-bold px-2 py-0.5 rounded",
                        previousScore === 0 ? "bg-error-100 text-error-700" :
                        previousScore < item.maxScore ? "bg-warning-100 text-warning-700" :
                        "bg-success-100 text-success-700"
                      )}>
                        {previousScore}
                      </span>
                      {change && change !== 'same' && (
                        <span className={clsx(
                          "text-xs font-bold",
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
                      placeholder="Adaugă o notă..."
                      className="w-full px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        onClick={() => setExpandedNote(null)}
                        className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                      >
                        Anulează
                      </button>
                      <button
                        onClick={() => saveNote(item.id)}
                        className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Salvează Notă
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

