"use client";

import { CarolinaSequence, CarolinaScore, CarolinaScoreValue } from "@/types/carolina";
import { clsx } from "clsx";
import { Check, Activity, X, MessageSquare, Info } from "lucide-react";
import { useState } from "react";

interface CarolinaScoringProps {
  sequence: CarolinaSequence;
  scores: Record<string, CarolinaScore>;
  onScoreChange: (itemId: string, value: CarolinaScoreValue, note?: string) => void;
}

export default function CarolinaScoring({
  sequence,
  scores,
  onScoreChange,
}: CarolinaScoringProps) {
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  return (
    <div className="space-y-6 pb-20">
      <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 mb-6">
        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 mb-1">
          {sequence.title}
        </h3>
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          Score items as Mastered (✓), Emerging (D), or Absent (A). 
          Stop if child scores 3 consecutive &apos;A&apos;s (Ceiling Rule).
        </p>
      </div>

      <div className="space-y-3">
        {sequence.items.map((item) => {
          const score = scores[item.id];
          const currentVal = score?.value;
          const hasNote = !!score?.note;

          return (
            <div 
              key={item.id}
              className={clsx(
                "p-4 rounded-xl border transition-all bg-white dark:bg-neutral-900",
                currentVal === 'M' ? "border-success-200 shadow-sm" :
                currentVal === 'D' ? "border-warning-200 shadow-sm" :
                currentVal === 'A' ? "border-error-200" :
                "border-neutral-200 dark:border-neutral-800"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 pt-1">
                  <p className="text-sm font-medium text-neutral-900 dark:text-white">
                    {item.text}
                  </p>
                  {item.age && (
                    <span className="text-[10px] text-neutral-400 font-medium mt-1 block">
                      Age: {item.age}mo
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onScoreChange(item.id, 'A', score?.note)}
                    className={clsx(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all font-bold text-sm",
                      currentVal === 'A' 
                        ? "bg-error-100 text-error-700 ring-2 ring-error-500 ring-offset-1" 
                        : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:bg-error-50 hover:text-error-600"
                    )}
                    title="Absent"
                  >
                    A
                  </button>
                  <button
                    onClick={() => onScoreChange(item.id, 'D', score?.note)}
                    className={clsx(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all font-bold text-sm",
                      currentVal === 'D' 
                        ? "bg-warning-100 text-warning-700 ring-2 ring-warning-500 ring-offset-1" 
                        : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:bg-warning-50 hover:text-warning-600"
                    )}
                    title="Emerging (Dezvoltare)"
                  >
                    D
                  </button>
                  <button
                    onClick={() => onScoreChange(item.id, 'M', score?.note)}
                    className={clsx(
                      "w-10 h-10 rounded-lg flex items-center justify-center transition-all font-bold text-sm",
                      currentVal === 'M' 
                        ? "bg-success-100 text-success-700 ring-2 ring-success-500 ring-offset-1" 
                        : "bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:bg-success-50 hover:text-success-600"
                    )}
                    title="Mastered"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Note Toggle */}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setActiveNoteId(activeNoteId === item.id ? null : item.id)}
                  className={clsx(
                    "text-xs flex items-center gap-1 px-2 py-1 rounded transition-colors",
                    hasNote || activeNoteId === item.id 
                      ? "text-primary-600 bg-primary-50 dark:bg-primary-900/20" 
                      : "text-neutral-400 hover:text-neutral-600"
                  )}
                >
                  <MessageSquare className="w-3 h-3" />
                  {hasNote ? "Edit Note" : "Add Note"}
                </button>
              </div>

              {/* Note Editor */}
              {(activeNoteId === item.id || hasNote) && (
                <div className={clsx(
                  "mt-2 animate-in slide-in-from-top-1",
                  activeNoteId !== item.id && "hidden"
                )}>
                  <textarea
                    value={score?.note || ""}
                    onChange={(e) => onScoreChange(item.id, currentVal || 'A', e.target.value)}
                    placeholder="Clinical observations..."
                    className="w-full p-2 text-xs bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    rows={2}
                  />
                </div>
              )}
              
              {/* Read-only note preview */}
              {hasNote && activeNoteId !== item.id && (
                <div className="mt-2 text-xs text-neutral-500 italic bg-neutral-50 dark:bg-neutral-800/50 p-2 rounded-lg border border-neutral-100 dark:border-neutral-800">
                  &quot;{score.note}&quot;
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
