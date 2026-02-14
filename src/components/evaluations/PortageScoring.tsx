"use client";

import { PortageCategory, PortageScore, PortageItem } from "@/types/portage";
import portageDataRaw from "../../../evals/portage.json";
import { clsx } from "clsx";
import { Check, X, Info, MessageSquare, ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useState } from "react";

const portageData = portageDataRaw as Record<string, PortageItem[]>;

interface PortageScoringProps {
  category: PortageCategory;
  scores: Record<string, PortageScore>;
  onScoreChange: (itemId: string, achieved: boolean, note?: string) => void;
  onBulkScoreChange: (itemIds: string[], achieved: boolean) => void;
  chronologicalAgeMonths: number;
}

export default function PortageScoring({
  category,
  scores,
  onScoreChange,
  onBulkScoreChange,
  chronologicalAgeMonths
}: PortageScoringProps) {
  const { t } = useTranslation();
  const items = portageData[category] || [];
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);

  // Group items by age label for better visualization
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.age]) acc[item.age] = [];
    acc[item.age].push(item);
    return acc;
  }, {} as Record<string, PortageItem[]>);

  const ageBrackets = Object.keys(groupedItems);

  const scrollToBracket = (id: string) => {
    const element = document.getElementById(`bracket-${id}`);
    const container = element?.closest('.overflow-y-auto');
    if (element && container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const offset = elementRect.top - containerRect.top + container.scrollTop - 80; // 80 for jump menu

      container.scrollTo({
        top: offset,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Quick Jump Menu */}
      <div className="sticky top-0 z-10 py-3 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 -mx-6 px-6 mb-8">
        {/* Mobile: Dropdown */}
        <div className="md:hidden">
          <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-2">{t('portage.jump_to')}:</label>
          <select
            onChange={(e) => scrollToBracket(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium border border-neutral-200 dark:border-neutral-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select age bracket...</option>
            {ageBrackets.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Desktop: Horizontal buttons */}
        <div className="hidden md:flex items-center gap-3 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] font-bold uppercase text-neutral-400 whitespace-nowrap">{t('portage.jump_to')}:</span>
          {ageBrackets.map((label) => (
            <button
              key={label}
              onClick={() => scrollToBracket(label)}
              className="px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-xs font-bold hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-600 transition-all whitespace-nowrap border border-neutral-200 dark:border-neutral-700"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {Object.entries(groupedItems).map(([ageLabel, ageItems]) => {
        const firstItem = ageItems[0];
        const isCurrentAgeBracket = chronologicalAgeMonths > (firstItem.months - 12) && chronologicalAgeMonths <= firstItem.months;
        const bracketItemIds = ageItems.map(i => i.id);

        return (
          <div 
            key={ageLabel} 
            id={`bracket-${ageLabel}`}
            className={clsx(
              "space-y-4 rounded-2xl transition-all scroll-mt-32",
              isCurrentAgeBracket ? "ring-2 ring-primary-500/50 p-4 bg-primary-50/30 dark:bg-primary-900/10" : ""
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h4 className={clsx(
                  "text-sm font-bold uppercase tracking-wider px-3 py-1 rounded-full",
                  isCurrentAgeBracket ? "bg-primary-500 text-white" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                )}>
                  {ageLabel}
                </h4>
                
                {/* Bulk Actions */}
                <div className="flex items-center bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-0.5 shadow-sm">
                  <button
                    onClick={() => onBulkScoreChange(bracketItemIds, true)}
                    className="p-1 hover:bg-success-50 dark:hover:bg-success-900/20 text-neutral-400 hover:text-success-600 rounded transition-colors"
                    title={t('portage.mark_all_achieved')}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-3 bg-neutral-200 dark:bg-neutral-700 mx-0.5" />
                  <button
                    onClick={() => onBulkScoreChange(bracketItemIds, false)}
                    className="p-1 hover:bg-error-50 dark:hover:bg-error-900/20 text-neutral-400 hover:text-error-600 rounded transition-colors"
                    title={t('portage.mark_all_not_achieved')}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isCurrentAgeBracket && (
                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 flex items-center gap-1">
                  <Info className="w-3 h-3" />
                  {t('portage.target_bracket')}
                </span>
              )}
            </div>

            <div className="grid gap-3">
              {ageItems.map((item) => {
                const score = scores[item.id];
                const isAchieved = score?.achieved === true;
                const hasNote = !!score?.note;

                return (
                  <div
                    key={item.id}
                    className={clsx(
                      "flex flex-col rounded-xl border transition-all overflow-hidden",
                      isAchieved
                        ? "bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800 shadow-sm"
                        : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                    )}
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex-1 mr-4">
                        <p className="text-sm font-medium text-neutral-900 dark:text-white">
                          {item.text}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveNoteId(activeNoteId === item.id ? null : item.id)}
                          className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all border",
                            hasNote 
                              ? "bg-primary-50 dark:bg-primary-900/30 border-primary-200 text-primary-600" 
                              : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-200 text-neutral-400"
                          )}
                          title={t('portage.observation_placeholder')}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onScoreChange(item.id, false, score?.note)}
                          className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                            score && !isAchieved
                              ? "bg-error-500 text-white shadow-lg"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200"
                          )}
                        >
                          <X className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => onScoreChange(item.id, true, score?.note)}
                          className={clsx(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                            isAchieved
                              ? "bg-success-500 text-white shadow-lg"
                              : "bg-neutral-100 dark:bg-neutral-800 text-neutral-400 hover:bg-neutral-200"
                          )}
                        >
                          <Check className="w-5 h-5" />
                        </button>
                      </div>
                    </div>

                    {/* Note Editor */}
                    {(activeNoteId === item.id || hasNote) && (
                      <div className={clsx(
                        "px-4 pb-4 pt-0 animate-in slide-in-from-top-2 duration-200",
                        activeNoteId !== item.id && "hidden"
                      )}>
                        <textarea
                          value={score?.note || ""}
                          onChange={(e) => onScoreChange(item.id, isAchieved, e.target.value)}
                          placeholder={t('portage.observation_placeholder')}
                          className="w-full p-3 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none transition-all resize-none"
                          rows={2}
                        />
                      </div>
                    )}
                    
                    {/* Read-only note preview when collapsed */}
                    {hasNote && activeNoteId !== item.id && (
                      <div className="px-4 pb-3 pt-0">
                        <div className="flex items-start gap-2 text-[10px] text-neutral-500 italic bg-black/5 dark:bg-white/5 p-2 rounded-lg">
                          <MessageSquare className="w-3 h-3 mt-0.5 shrink-0" />
                          <p className="line-clamp-1">{score.note}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

