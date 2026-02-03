"use client";

import { clsx } from "clsx";

interface TherapistUtilizationChartProps {
  data: { name: string; billable: number; capacity: number }[];
}

export default function TherapistUtilizationChart({ data }: TherapistUtilizationChartProps) {
  // Sort by utilization percentage (descending)
  const sortedData = [...data].sort((a, b) => {
    const utilA = (a.billable / a.capacity) || 0;
    const utilB = (b.billable / b.capacity) || 0;
    return utilB - utilA;
  });

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm flex flex-col h-full max-h-[400px]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Therapist Utilization</h3>
        <span className="text-xs font-medium text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-full">
          Weekly Hours
        </span>
      </div>

      <div className="overflow-y-auto pr-2 space-y-4 flex-1 custom-scrollbar">
        {sortedData.map((member, index) => {
          const utilization = Math.min(100, Math.round((member.billable / member.capacity) * 100)) || 0;
          
          // Color coding based on utilization
          let progressColor = "bg-primary-500";
          if (utilization > 90) progressColor = "bg-error-500"; // Overworked?
          else if (utilization < 50) progressColor = "bg-warning-500"; // Underutilized
          else progressColor = "bg-success-500"; // Healthy

          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[150px]" title={member.name}>
                  {member.name}
                </span>
                <span className="text-neutral-500 dark:text-neutral-400 font-mono text-xs">
                  {member.billable} / {member.capacity} hrs
                </span>
              </div>
              
              <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div 
                  className={clsx("h-full rounded-full transition-all duration-500", progressColor)}
                  style={{ width: `${utilization}%` }}
                />
              </div>
            </div>
          );
        })}

        {sortedData.length === 0 && (
          <div className="text-center py-8 text-neutral-400 text-sm">
            No utilization data available.
          </div>
        )}
      </div>
    </div>
  );
}
