"use client";

import dynamic from "next/dynamic";
import { useAnalyticsData } from "@/hooks/useAnalyticsData";
import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

// Dynamic imports for heavy chart components
const SessionVolumeChart = dynamic(() => import("@/components/analytics/SessionVolumeChart"), { 
  loading: () => <div className="h-64 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
});
const AttendanceTrendChart = dynamic(() => import("@/components/analytics/AttendanceTrendChart"), {
  loading: () => <div className="h-64 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
});
const RevenueMixChart = dynamic(() => import("@/components/analytics/RevenueMixChart"), {
  loading: () => <div className="h-64 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
});
const TherapistUtilizationChart = dynamic(() => import("@/components/analytics/TherapistUtilizationChart"), {
  loading: () => <div className="h-64 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
});
const GlobalGoalAchievementChart = dynamic(() => import("@/components/analytics/GlobalGoalAchievementChart"), {
  loading: () => <div className="h-64 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
});
const CancellationRiskWidget = dynamic(() => import("@/components/analytics/CancellationRiskWidget"), {
  loading: () => <div className="h-64 bg-neutral-100 dark:bg-neutral-800 animate-pulse rounded-2xl" />
});

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const [currentDate] = useState(new Date());
  const { data, loading } = useAnalyticsData(
    currentDate.getFullYear(), 
    currentDate.getMonth()
  );

  if (loading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin" />
          <p className="text-sm font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex-1 p-6 space-y-8 animate-in fade-in duration-500">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {data.kpis.map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{t(kpi.label)}</p>
            <div className="flex items-baseline justify-between mt-2">
              <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{kpi.value}</h3>
              <div className={clsx(
                "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                kpi.trend === 'up' 
                  ? "bg-success-50 text-success-600 dark:bg-success-900/20" 
                  : "bg-error-50 text-error-600 dark:bg-error-900/20"
              )}>
                {kpi.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {kpi.change.startsWith('analytics.') ? t(kpi.change) : kpi.change}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Row 1: Volume & Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 aspect-[4/3] lg:aspect-auto lg:h-[400px]">
          <SessionVolumeChart data={data.sessionChartData} />
        </div>
        <div className="aspect-[4/3] lg:aspect-auto lg:h-[400px]">
          <RevenueMixChart data={data.revenueMixData} />
        </div>
      </div>

      {/* Row 2: AI & Clinical */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="aspect-[4/3] lg:aspect-auto lg:h-[400px]">
          <CancellationRiskWidget data={data.predictive.highRiskClients} />
        </div>
        <div className="aspect-[4/3] lg:aspect-auto lg:h-[400px]">
          <GlobalGoalAchievementChart data={data.clinicalData} />
        </div>
      </div>

      {/* Row 3: Operational */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="aspect-[4/3] lg:aspect-auto lg:h-[400px]">
          <TherapistUtilizationChart data={data.teamUtilizationData} />
        </div>
        <div className="aspect-[4/3] lg:aspect-auto lg:h-[400px]">
          <AttendanceTrendChart data={data.attendanceData} />
        </div>
      </div>
    </div>
  );
}
