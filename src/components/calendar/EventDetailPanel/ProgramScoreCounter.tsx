"use client";

import { useCallback, useRef } from "react";
import { clsx } from "clsx";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";

export interface ProgramScores {
  minus: number;
  zero: number;
  prompted: number;
  plus: number;
}

interface ProgramScoreCounterProps {
  programId: string;
  programTitle: string;
  programDescription?: string;
  scores: ProgramScores;
  onChange: (programId: string, scores: ProgramScores) => void;
  disabled?: boolean;
}

const SCORE_CONFIG = [
  { key: "minus" as const, label: "−", color: "error", description: "Incorrect" },
  { key: "zero" as const, label: "0", color: "neutral", description: "No Response" },
  { key: "prompted" as const, label: "P", color: "warning", description: "Prompted" },
  { key: "plus" as const, label: "+", color: "success", description: "Correct" },
];

export default function ProgramScoreCounter({
  programId,
  programTitle,
  programDescription,
  scores,
  onChange,
  disabled = false,
}: ProgramScoreCounterProps) {
  const { info } = useToast();
  const { t } = useTranslation();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const didLongPress = useRef(false);

  const totalTrials = scores.minus + scores.zero + scores.prompted + scores.plus;
  const successRate = totalTrials > 0 ? Math.round((scores.plus / totalTrials) * 100) : 0;

  const handleIncrement = useCallback(
    (key: keyof ProgramScores) => {
      if (disabled) return;

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }

      onChange(programId, {
        ...scores,
        [key]: scores[key] + 1,
      });
    },
    [programId, scores, onChange, disabled]
  );

  const handleDecrement = useCallback(
    (key: keyof ProgramScores) => {
      if (disabled || scores[key] <= 0) return;

      if (navigator.vibrate) {
        navigator.vibrate([10, 50, 10]);
      }

      onChange(programId, {
        ...scores,
        [key]: scores[key] - 1,
      });
      info(t('calendar.event.score_decreased'), 2000);
    },
    [programId, scores, onChange, disabled, info, t]
  );

  const handlePointerDown = (key: keyof ProgramScores) => {
    if (disabled) return;
    didLongPress.current = false;

    const timer = setTimeout(() => {
      didLongPress.current = true;
      handleDecrement(key);
    }, 500);

    longPressTimer.current = timer;
  };

  const handlePointerUp = (key: keyof ProgramScores) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // If we didn't trigger long press, it's a tap (increment)
    if (!didLongPress.current) {
      handleIncrement(key);
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const getButtonColors = (color: string, isActive: boolean) => {
    const colors: Record<string, { bg: string; activeBg: string; text: string }> = {
      error: {
        bg: "bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800",
        activeBg: "bg-error-500 border-error-600",
        text: "text-error-600 dark:text-error-400",
      },
      neutral: {
        bg: "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700",
        activeBg: "bg-neutral-500 border-neutral-600",
        text: "text-neutral-600 dark:text-neutral-400",
      },
      warning: {
        bg: "bg-warning-50 dark:bg-warning-900/20 border-warning-200 dark:border-warning-800",
        activeBg: "bg-warning-500 border-warning-600",
        text: "text-warning-600 dark:text-warning-400",
      },
      success: {
        bg: "bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800",
        activeBg: "bg-success-500 border-success-600",
        text: "text-success-600 dark:text-success-400",
      },
    };

    return colors[color] || colors.neutral;
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
      {/* Program Header */}
      <div className="mb-3">
        <h4 className="font-semibold text-sm text-neutral-900 dark:text-white">
          {programTitle}
        </h4>
        {programDescription && (
          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-1">
            {programDescription}
          </p>
        )}
      </div>

      {/* Score Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {SCORE_CONFIG.map(({ key, label, color, description }) => {
          const colors = getButtonColors(color, scores[key] > 0);

          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onPointerDown={() => handlePointerDown(key)}
              onPointerUp={() => handlePointerUp(key)}
              onPointerLeave={handlePointerLeave}
              onContextMenu={(e) => e.preventDefault()}
              className={clsx(
                "w-full h-14 rounded-xl border-2 flex flex-col items-center justify-center transition-all select-none touch-none",
                disabled && "opacity-50 cursor-not-allowed",
                scores[key] > 0 ? colors.activeBg + " text-white" : colors.bg + " " + colors.text,
                !disabled && "active:scale-95"
              )}
              title={description}
            >
              <span className="text-lg font-bold leading-none">{label}</span>
              <span className="text-xs font-medium mt-0.5 opacity-80">{scores[key]}</span>
            </button>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-3">
          <span className="text-neutral-500">
            Total: <span className="font-bold text-neutral-700 dark:text-neutral-300">{totalTrials}</span>
          </span>
          <span className="text-neutral-500">
            Success: <span className={clsx(
              "font-bold",
              successRate >= 80 ? "text-success-600" :
              successRate >= 50 ? "text-warning-600" :
              totalTrials > 0 ? "text-error-600" : "text-neutral-400"
            )}>{successRate}%</span>
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      {totalTrials > 0 && (
        <div className="mt-2 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div
            className={clsx(
              "h-full transition-all duration-300 rounded-full",
              successRate >= 80 ? "bg-success-500" :
              successRate >= 50 ? "bg-warning-500" : "bg-error-500"
            )}
            style={{ width: `${successRate}%` }}
          />
        </div>
      )}
    </div>
  );
}
