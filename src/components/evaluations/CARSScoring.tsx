"use client";

import { CARS_ITEMS, CARSScore, CARSItem } from "@/types/cars";
import { clsx } from "clsx";
import { Info, MessageSquare, AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface CARSScoringProps {
  scores: Record<string, CARSScore>;
  onScoreChange: (itemId: number, value: number, note?: string) => void;
}

export default function CARSScoring({
  scores,
  onScoreChange,
}: CARSScoringProps) {
  const { t } = useTranslation();
  const [activeNoteId, setActiveNoteId] = useState<number | null>(null);

  const SCORE_VALUES = [1, 1.5, 2, 2.5, 3, 3.5, 4];

  return (
    <div className="space-y-10 pb-20">
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-2xl flex gap-3 text-sm text-amber-800 dark:text-amber-200 mb-8">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <p>
          {t('cars.scoring_instruction')}
        </p>
      </div>

      {CARS_ITEMS.map((item) => {
        const score = scores[item.id.toString()];
        const currentValue = score?.value || 0;
        const hasNote = !!score?.note;

        return (
          <div
            key={item.id}
            className={clsx(
              "p-6 rounded-3xl border transition-all",
              currentValue > 0
                ? "bg-white dark:bg-neutral-900 border-primary-200 dark:border-primary-800 shadow-sm"
                : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-800 opacity-80"
            )}
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 flex items-center justify-center text-sm">
                    {item.id}
                  </span>
                  {item.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveNoteId(activeNoteId === item.id ? null : item.id)}
                className={clsx(
                  "p-2 rounded-xl transition-all border",
                  hasNote 
                    ? "bg-primary-50 dark:bg-primary-900/30 border-primary-200 text-primary-600" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 text-neutral-400"
                )}
                title={t('cars.observation_placeholder')}
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>

            {/* Scale Options */}
            <div className="grid grid-cols-7 gap-2 mb-6">
              {SCORE_VALUES.map((val) => (
                <button
                  key={val}
                  onClick={() => onScoreChange(item.id, val, score?.note)}
                  className={clsx(
                    "py-3 rounded-xl font-bold text-sm transition-all border",
                    currentValue === val
                      ? "bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-600/20"
                      : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-500 hover:border-primary-300"
                  )}
                >
                  {val}
                </button>
              ))}
            </div>

            {/* Level Descriptions (Context) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {[1, 2, 3, 4].map((level) => (
                <div key={level} className="text-xs p-3 bg-neutral-100 dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800">
                  <span className="font-black text-neutral-400 uppercase tracking-widest block mb-1">{t('common.level')} {level}</span>
                  <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {(item.descriptions as any)[level]}
                  </p>
                </div>
              ))}
            </div>

            {/* Note Editor */}
            {(activeNoteId === item.id || hasNote) && (
              <div className="animate-in slide-in-from-top-2 duration-200">
                <textarea
                  value={score?.note || ""}
                  onChange={(e) => onScoreChange(item.id, currentValue, e.target.value)}
                  placeholder={t('cars.observation_placeholder')}
                  className={clsx(
                    "w-full p-4 bg-white dark:bg-neutral-950 border rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none",
                    activeNoteId !== item.id && "hidden",
                    hasNote ? "border-primary-200" : "border-neutral-200"
                  )}
                  rows={3}
                />
                {hasNote && activeNoteId !== item.id && (
                  <div className="p-3 bg-primary-50/50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-800/30 rounded-xl flex items-start gap-2">
                    <Info className="w-4 h-4 text-primary-500 mt-0.5" />
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 italic">
                      {score.note}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
