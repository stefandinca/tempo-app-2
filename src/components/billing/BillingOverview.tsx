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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorClasses[card.color];

        return (
          <div
            key={card.label}
            className={clsx(
              "bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md",
              loading && "animate-pulse"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider font-display">{card.label}</span>
              <div className={clsx("p-2 rounded-lg", colors.bg, colors.text)}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-1.5">
              {loading ? (
                <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded" />
              ) : (
                <>
                  <h3 className={clsx(
                    "text-2xl font-bold font-display",
                    card.label === "Profit" && (card.value >= 0 ? "text-success-600" : "text-error-600"),
                    card.label !== "Profit" && "text-neutral-900 dark:text-white"
                  )}>
                    {formatCurrency(card.value)}
                  </h3>
                  <span className="text-xs font-medium text-neutral-400">RON</span>
                </>
              )}
            </div>
            <p className="text-[10px] text-neutral-400 mt-2 font-medium">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
