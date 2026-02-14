"use client";

import { DollarSign, Clock, CheckCircle, TrendingUp, Users } from "lucide-react";
import { BillingSummary } from "@/lib/billing";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface BillingOverviewProps {
  summary: BillingSummary;
  loading?: boolean;
}

export default function BillingOverview({ summary, loading }: BillingOverviewProps) {
  const { t } = useTranslation();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const cards = [
    {
      label: t('billing_summary.total_revenue'),
      value: summary.totalRevenue,
      icon: TrendingUp,
      color: "primary",
      subtitle: t('billing_summary.revenue_subtitle')
    },
    {
      label: t('billing_summary.pending'),
      value: summary.pendingAmount,
      count: summary.pendingCount,
      icon: Clock,
      color: "warning",
      subtitle: summary.pendingCount === 1 
        ? t('billing_summary.pending_subtitle', { count: summary.pendingCount })
        : t('billing_summary.pending_subtitle_plural', { count: summary.pendingCount })
    },
    {
      label: t('billing_summary.collected'),
      value: summary.paidAmount,
      count: summary.paidCount,
      icon: CheckCircle,
      color: "success",
      subtitle: summary.paidCount === 1
        ? t('billing_summary.collected_subtitle', { count: summary.paidCount })
        : t('billing_summary.collected_subtitle_plural', { count: summary.paidCount })
    },
    {
      label: t('billing_summary.staff_costs'),
      value: summary.staffCosts,
      icon: Users,
      color: "error",
      subtitle: t('billing_summary.staff_costs_subtitle')
    },
    {
      label: t('billing_summary.expenses'),
      value: summary.otherExpenses,
      icon: DollarSign,
      color: "error",
      subtitle: t('billing_summary.expenses_subtitle')
    },
    {
      label: t('billing_summary.profit'),
      value: summary.profit,
      icon: TrendingUp,
      color: summary.profit >= 0 ? "success" : "error",
      subtitle: t('billing_summary.profit_subtitle')
    }
  ];

  const colorClasses: Record<string, { bg: string; text: string }> = {
    primary: {
      bg: "bg-primary-50 dark:bg-primary-900/20",
      text: "text-primary-600"
    },
    warning: {
      bg: "bg-warning-50 dark:bg-warning-900/20",
      text: "text-warning-600"
    },
    success: {
      bg: "bg-success-50 dark:bg-success-900/20",
      text: "text-success-600"
    },
    error: {
      bg: "bg-error-50 dark:bg-error-900/20",
      text: "text-error-600"
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 lg:gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorClasses[card.color];

        return (
          <div
            key={card.label}
            className={clsx(
              "bg-white dark:bg-neutral-900 p-3 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md flex lg:flex-col items-center lg:items-stretch gap-4 lg:gap-0",
              loading && "animate-pulse"
            )}
          >
            <div className={`p-1.5 lg:p-2 rounded-lg ${colors.bg} ${colors.text} lg:mb-4 flex-shrink-0`}>
              <Icon className="w-4 h-4 lg:w-4 lg:h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-1">
                <span className="text-[10px] lg:text-xs font-bold text-neutral-500 uppercase tracking-wider font-display truncate">{card.label}</span>
              </div>
              <div className="flex items-baseline gap-1 lg:gap-1.5">
                {loading ? (
                  <div className="h-6 lg:h-8 w-20 lg:w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
                ) : (
                  <>
                    <h3 className={clsx(
                      "text-lg lg:text-2xl font-bold font-display leading-none",
                      card.label === "Profit" && (card.value >= 0 ? "text-success-600" : "text-error-600"),
                      card.label !== "Profit" && "text-neutral-900 dark:text-white"
                    )}>
                      {formatCurrency(card.value)}
                    </h3>
                    <span className="text-[10px] lg:text-xs font-medium text-neutral-400">RON</span>
                  </>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 mt-1 lg:mt-2 font-medium hidden sm:block lg:block">{card.subtitle}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
