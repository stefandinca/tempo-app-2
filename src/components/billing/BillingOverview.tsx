"use client";

import { DollarSign, Clock, CheckCircle, TrendingUp, Users } from "lucide-react";
import { BillingSummary } from "@/lib/billing";
import { clsx } from "clsx";

interface BillingOverviewProps {
  summary: BillingSummary;
  loading?: boolean;
}

export default function BillingOverview({ summary, loading }: BillingOverviewProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const cards = [
    {
      label: "Total Revenue",
      value: summary.totalRevenue,
      icon: TrendingUp,
      color: "primary",
      subtitle: "This month"
    },
    {
      label: "Pending",
      value: summary.pendingAmount,
      count: summary.pendingCount,
      icon: Clock,
      color: "warning",
      subtitle: `${summary.pendingCount} invoice${summary.pendingCount !== 1 ? "s" : ""}`
    },
    {
      label: "Collected",
      value: summary.paidAmount,
      count: summary.paidCount,
      icon: CheckCircle,
      color: "success",
      subtitle: `${summary.paidCount} invoice${summary.paidCount !== 1 ? "s" : ""}`
    },
    {
      label: "Staff Costs",
      value: summary.totalExpenses,
      icon: Users,
      color: "error",
      subtitle: "Paid salaries & bonuses"
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const colors = colorClasses[card.color];

        return (
          <div
            key={card.label}
            className={clsx(
              "bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm",
              loading && "animate-pulse"
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-neutral-500">{card.label}</span>
              <div className={clsx("p-2 rounded-lg", colors.bg, colors.text)}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline gap-2">
              {loading ? (
                <div className="h-9 w-32 bg-neutral-200 dark:bg-neutral-700 rounded" />
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(card.value)}
                  </h3>
                  <span className="text-sm font-medium text-neutral-500">RON</span>
                </>
              )}
            </div>
            <p className="text-xs text-neutral-400 mt-1">{card.subtitle}</p>
          </div>
        );
      })}
    </div>
  );
}
