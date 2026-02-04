"use client";

import { useMemo } from "react";
import { clsx } from "clsx";
import { VBMAPPEvaluation, MilestoneScore } from "@/types/vbmapp";
import {
  VBMAPP_LEVEL_1_AREAS,
  VBMAPP_LEVEL_2_AREAS,
  VBMAPP_LEVEL_3_AREAS
} from "@/hooks/useVBMAPP";

interface VBMAPPMilestoneGridProps {
  evaluation: VBMAPPEvaluation;
  previousEvaluation?: VBMAPPEvaluation | null;
  compact?: boolean;
}

// Get unique skill codes across all levels
const SKILL_CODES = [
  "MAND", "TACT", "LR", "VP-MTS", "PLAY", "SOCIAL", "IMITATION", "ECHOIC", "EESA",
  "LRFFC", "IV", "GROUP", "LING", "READING", "WRITING", "MATH"
];

export default function VBMAPPMilestoneGrid({
  evaluation,
  previousEvaluation,
  compact = false
}: VBMAPPMilestoneGridProps) {
  // Build grid data
  const gridData = useMemo(() => {
    const data: Record<string, { level1: (MilestoneScore | null)[]; level2: (MilestoneScore | null)[]; level3: (MilestoneScore | null)[] }> = {};

    // Initialize all codes
    SKILL_CODES.forEach((code) => {
      data[code] = {
        level1: [],
        level2: [],
        level3: []
      };
    });

    // Fill Level 1
    VBMAPP_LEVEL_1_AREAS.forEach((area) => {
      if (!data[area.code]) return;
      area.items.forEach((item) => {
        const score = evaluation.milestoneScores[item.id]?.score as MilestoneScore | undefined;
        data[area.code].level1.push(score ?? null);
      });
    });

    // Fill Level 2
    VBMAPP_LEVEL_2_AREAS.forEach((area) => {
      if (!data[area.code]) return;
      area.items.forEach((item) => {
        const score = evaluation.milestoneScores[item.id]?.score as MilestoneScore | undefined;
        data[area.code].level2.push(score ?? null);
      });
    });

    // Fill Level 3
    VBMAPP_LEVEL_3_AREAS.forEach((area) => {
      if (!data[area.code]) return;
      area.items.forEach((item) => {
        const score = evaluation.milestoneScores[item.id]?.score as MilestoneScore | undefined;
        data[area.code].level3.push(score ?? null);
      });
    });

    return data;
  }, [evaluation]);

  const getScoreColor = (score: MilestoneScore | null) => {
    if (score === null) return "bg-neutral-100 dark:bg-neutral-800";
    if (score === 0) return "bg-neutral-200 dark:bg-neutral-700";
    if (score === 0.5) return "bg-warning-400";
    return "bg-success-500";
  };

  const cellSize = compact ? "w-4 h-4" : "w-6 h-6";
  const fontSize = compact ? "text-[8px]" : "text-[10px]";

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        {/* Header */}
        <div className="flex items-end gap-1 mb-2">
          <div className={clsx("w-16 flex-shrink-0", fontSize, "font-bold text-neutral-500")} />

          {/* Level labels */}
          <div className="flex gap-px">
            <div className={clsx("flex gap-px border-r border-neutral-300 dark:border-neutral-600 pr-1 mr-1")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <div key={`l1-${n}`} className={clsx(cellSize, "flex items-end justify-center", fontSize, "text-neutral-400")}>
                  {n}
                </div>
              ))}
            </div>
            <div className={clsx("flex gap-px border-r border-neutral-300 dark:border-neutral-600 pr-1 mr-1")}>
              {[6, 7, 8, 9, 10].map((n) => (
                <div key={`l2-${n}`} className={clsx(cellSize, "flex items-end justify-center", fontSize, "text-neutral-400")}>
                  {n}
                </div>
              ))}
            </div>
            <div className="flex gap-px">
              {[11, 12, 13, 14, 15].map((n) => (
                <div key={`l3-${n}`} className={clsx(cellSize, "flex items-end justify-center", fontSize, "text-neutral-400")}>
                  {n}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Level header row */}
        <div className="flex items-center gap-1 mb-2">
          <div className={clsx("w-16 flex-shrink-0", fontSize, "font-bold text-neutral-500")} />
          <div className="flex gap-px">
            <div className={clsx("flex gap-px border-r border-neutral-300 dark:border-neutral-600 pr-1 mr-1")}>
              <div className={clsx("flex items-center justify-center bg-indigo-100 dark:bg-indigo-900/30 rounded px-2 py-0.5", fontSize, "font-bold text-indigo-600 dark:text-indigo-400")} style={{ width: compact ? 88 : 134 }}>
                Level 1
              </div>
            </div>
            <div className={clsx("flex gap-px border-r border-neutral-300 dark:border-neutral-600 pr-1 mr-1")}>
              <div className={clsx("flex items-center justify-center bg-purple-100 dark:bg-purple-900/30 rounded px-2 py-0.5", fontSize, "font-bold text-purple-600 dark:text-purple-400")} style={{ width: compact ? 88 : 134 }}>
                Level 2
              </div>
            </div>
            <div className="flex gap-px">
              <div className={clsx("flex items-center justify-center bg-pink-100 dark:bg-pink-900/30 rounded px-2 py-0.5", fontSize, "font-bold text-pink-600 dark:text-pink-400")} style={{ width: compact ? 88 : 134 }}>
                Level 3
              </div>
            </div>
          </div>
        </div>

        {/* Grid rows */}
        <div className="space-y-1">
          {SKILL_CODES.map((code) => {
            const rowData = gridData[code];
            if (!rowData) return null;

            // Check if this code has any items
            const hasLevel1 = rowData.level1.length > 0;
            const hasLevel2 = rowData.level2.length > 0;
            const hasLevel3 = rowData.level3.length > 0;

            if (!hasLevel1 && !hasLevel2 && !hasLevel3) return null;

            return (
              <div key={code} className="flex items-center gap-1">
                {/* Code label */}
                <div className={clsx("w-16 flex-shrink-0 text-right pr-2", fontSize, "font-bold text-neutral-700 dark:text-neutral-300")}>
                  {code}
                </div>

                {/* Cells */}
                <div className="flex gap-px">
                  {/* Level 1 cells */}
                  <div className="flex gap-px border-r border-neutral-300 dark:border-neutral-600 pr-1 mr-1">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const score = rowData.level1[idx];
                      const hasItem = idx < rowData.level1.length;

                      return (
                        <div
                          key={`${code}-l1-${idx}`}
                          className={clsx(
                            cellSize,
                            "rounded-sm transition-colors",
                            hasItem ? getScoreColor(score) : "bg-neutral-50 dark:bg-neutral-900"
                          )}
                          title={hasItem ? `${code} ${idx + 1}: ${score ?? 'Not scored'}` : undefined}
                        />
                      );
                    })}
                  </div>

                  {/* Level 2 cells */}
                  <div className="flex gap-px border-r border-neutral-300 dark:border-neutral-600 pr-1 mr-1">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const score = rowData.level2[idx];
                      const hasItem = idx < rowData.level2.length;

                      return (
                        <div
                          key={`${code}-l2-${idx}`}
                          className={clsx(
                            cellSize,
                            "rounded-sm transition-colors",
                            hasItem ? getScoreColor(score) : "bg-neutral-50 dark:bg-neutral-900"
                          )}
                          title={hasItem ? `${code} ${idx + 6}: ${score ?? 'Not scored'}` : undefined}
                        />
                      );
                    })}
                  </div>

                  {/* Level 3 cells */}
                  <div className="flex gap-px">
                    {[0, 1, 2, 3, 4].map((idx) => {
                      const score = rowData.level3[idx];
                      const hasItem = idx < rowData.level3.length;

                      return (
                        <div
                          key={`${code}-l3-${idx}`}
                          className={clsx(
                            cellSize,
                            "rounded-sm transition-colors",
                            hasItem ? getScoreColor(score) : "bg-neutral-50 dark:bg-neutral-900"
                          )}
                          title={hasItem ? `${code} ${idx + 11}: ${score ?? 'Not scored'}` : undefined}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <span className={clsx(fontSize, "text-neutral-500 font-medium")}>Legend:</span>
          <div className="flex items-center gap-1">
            <div className={clsx(cellSize, "rounded-sm bg-neutral-200 dark:bg-neutral-700")} />
            <span className={clsx(fontSize, "text-neutral-500")}>0 - Not present</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={clsx(cellSize, "rounded-sm bg-warning-400")} />
            <span className={clsx(fontSize, "text-neutral-500")}>½ - Emerging</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={clsx(cellSize, "rounded-sm bg-success-500")} />
            <span className={clsx(fontSize, "text-neutral-500")}>1 - Mastered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={clsx(cellSize, "rounded-sm bg-neutral-100 dark:bg-neutral-800")} />
            <span className={clsx(fontSize, "text-neutral-500")}>Not scored</span>
          </div>
        </div>
      </div>
    </div>
  );
}
