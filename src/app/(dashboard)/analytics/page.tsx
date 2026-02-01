"use client";

import SessionVolumeChart from "@/components/analytics/SessionVolumeChart";
import AttendanceTrendChart from "@/components/analytics/AttendanceTrendChart";
import RevenueMixChart from "@/components/analytics/RevenueMixChart";
import { KPI_DATA } from "@/components/analytics/mockData";
import { TrendingUp, TrendingDown } from "lucide-react";
import { clsx } from "clsx";

export default function AnalyticsPage() {
  return (
    <div className="flex-1 p-6 space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {KPI_DATA.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{kpi.label}</p>
            <div className="flex items-baseline justify-between mt-2">
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{kpi.value}</h3>
              <div className={clsx(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                kpi.trend === 'up' 
                  ? "bg-success-50 text-success-600 dark:bg-success-900/20" 
                  : "bg-error-50 text-error-600 dark:bg-error-900/20"
              )}>
                {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SessionVolumeChart />
        </div>
        <div>
          <RevenueMixChart />
        </div>
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AttendanceTrendChart />
        {/* Placeholder for future chart */}
        <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
          <p className="font-bold text-neutral-400 dark:text-neutral-600">Therapist Utilization</p>
          <p className="text-sm text-neutral-400 dark:text-neutral-600 mt-1">Coming in next update</p>
        </div>
      </div>
    </div>
  );
}
