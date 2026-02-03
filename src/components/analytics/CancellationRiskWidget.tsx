"use client";

import { AlertTriangle } from "lucide-react";

interface CancellationRiskWidgetProps {
  data: {
    id: string;
    name: string;
    cancellations: number;
    trend: 'high' | 'medium' | 'low';
  }[];
}

export default function CancellationRiskWidget({ data }: CancellationRiskWidgetProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 bg-error-50 dark:bg-error-900/20 rounded-lg text-error-600 dark:text-error-400">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Cancellation Risk Radar</h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Clients with multiple cancellations this month</p>
        </div>
      </div>

      <div className="space-y-4">
        {data.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No high-risk clients detected. Great job!
          </div>
        ) : (
          data.map((client) => (
            <div key={client.id} className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-error-100 dark:bg-error-900/30 flex items-center justify-center text-error-700 dark:text-error-400 font-bold text-xs">
                  {client.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-sm text-neutral-900 dark:text-white">{client.name}</p>
                  <p className="text-xs text-error-600 dark:text-error-400 font-medium">
                    {client.cancellations} Cancellations
                  </p>
                </div>
              </div>
              <div className="px-2 py-1 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-400">
                Action Required
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
