"use client";

import { DollarSign, Clock, CheckCircle } from "lucide-react";
import { BILLING_STATS } from "./mockData";

export default function BillingOverview() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Revenue */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-neutral-500">Total Revenue</span>
          <div className="p-2 bg-success-50 dark:bg-success-900/20 rounded-lg text-success-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">
            ${BILLING_STATS.revenue.value.toLocaleString()}
          </h3>
          <span className="text-sm font-medium text-success-600">
            +{BILLING_STATS.revenue.change}%
          </span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">vs last month</p>
      </div>

      {/* Pending */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-neutral-500">Pending</span>
          <div className="p-2 bg-warning-50 dark:bg-warning-900/20 rounded-lg text-warning-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">
            ${BILLING_STATS.pending.value.toLocaleString()}
          </h3>
          <span className="text-sm font-medium text-neutral-500">
            {BILLING_STATS.pending.count} invoices
          </span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">Awaiting payment</p>
      </div>

      {/* Paid */}
      <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-neutral-500">Paid</span>
          <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg text-primary-600">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-bold text-neutral-900 dark:text-white">
            ${BILLING_STATS.paid.value.toLocaleString()}
          </h3>
          <span className="text-sm font-medium text-neutral-500">
            {BILLING_STATS.paid.count} invoices
          </span>
        </div>
        <p className="text-xs text-neutral-400 mt-1">Processed this month</p>
      </div>
    </div>
  );
}
