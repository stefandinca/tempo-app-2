"use client";

import { useState } from "react";
import { clsx } from "clsx";
import {
  Lightbulb,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Target,
  FileText
} from "lucide-react";
import { SuggestedGoal } from "@/lib/goalGenerator";

interface SuggestedGoalsProps {
  goals: SuggestedGoal[];
  title?: string;
  emptyMessage?: string;
}

export default function SuggestedGoals({
  goals,
  title = "Suggested IEP Goals",
  emptyMessage = "No emerging skills identified for goal development."
}: SuggestedGoalsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyGoal = async (goal: SuggestedGoal) => {
    const text = `Goal: ${goal.goalText}\n\nShort-term Objective: ${goal.shortTermObjective}\n\nTarget Skill: ${goal.itemDescription}\nCriteria: ${goal.targetCriteria}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(goal.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleCopyAll = async () => {
    const text = goals.map((goal, i) =>
      `Goal ${i + 1}: ${goal.skillCode} - ${goal.skillArea}\n${goal.goalText}\n\nShort-term Objective:\n${goal.shortTermObjective}\n\nTarget Skill: ${goal.itemDescription}\n`
    ).join("\n---\n\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (goals.length === 0) {
    return (
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl text-center">
        <Lightbulb className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
        <p className="text-sm text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  // Group goals by skill area
  const groupedGoals = goals.reduce((acc, goal) => {
    const key = goal.skillCode || goal.skillArea;
    if (!acc[key]) {
      acc[key] = { name: goal.skillArea, goals: [] };
    }
    acc[key].goals.push(goal);
    return acc;
  }, {} as Record<string, { name: string; goals: SuggestedGoal[] }>);

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-100/50 dark:hover:bg-amber-900/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 dark:bg-amber-800/50 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-neutral-900 dark:text-white">{title}</h4>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {goals.length} emerging skill{goals.length !== 1 ? 's' : ''} identified for IEP development
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold rounded-full">
            {goals.length}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-neutral-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-amber-200 dark:border-amber-800">
          {/* Copy All Button */}
          <div className="px-4 py-2 bg-amber-100/50 dark:bg-amber-900/30 flex justify-end">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800 rounded-lg transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied All!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy All Goals
                </>
              )}
            </button>
          </div>

          {/* Goals by Area */}
          <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(groupedGoals).map(([code, group]) => (
              <div key={code} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 text-xs font-bold rounded">
                    {code}
                  </span>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    {group.name}
                  </span>
                </div>

                {group.goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="bg-white dark:bg-neutral-800 rounded-lg p-3 border border-amber-100 dark:border-neutral-700"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-amber-500 flex-shrink-0" />
                          <span className="text-xs font-medium text-neutral-500">
                            {goal.itemId}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300 mb-2">
                          {goal.itemDescription}
                        </p>
                        <div className="bg-neutral-50 dark:bg-neutral-900 rounded p-2">
                          <p className="text-xs font-medium text-neutral-500 mb-1">Goal:</p>
                          <p className="text-sm text-neutral-800 dark:text-neutral-200">
                            {goal.goalText}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyGoal(goal)}
                        className={clsx(
                          "p-2 rounded-lg transition-colors flex-shrink-0",
                          copiedId === goal.id
                            ? "bg-success-100 dark:bg-success-900/30 text-success-600"
                            : "hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-400"
                        )}
                        title="Copy goal"
                      >
                        {copiedId === goal.id ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-amber-100/50 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-800">
            <p className="text-xs text-neutral-500 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Goals are auto-generated from emerging skills (scored 0.5 in VB-MAPP, 1 in ABLLS)
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
