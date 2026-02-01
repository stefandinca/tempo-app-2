"use client";

import { INVOICES } from "./mockData";
import { FileText, MoreVertical, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { clsx } from "clsx";

export default function InvoiceList() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400";
      case "pending": return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400";
      case "overdue": return "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400";
      default: return "bg-neutral-100 text-neutral-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return CheckCircle;
      case "pending": return Clock;
      case "overdue": return AlertTriangle;
      default: return FileText;
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h3 className="font-bold text-lg text-neutral-900 dark:text-white">Recent Invoices</h3>
        <button className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
          View All
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
            <tr>
              <th className="px-6 py-3">Invoice ID</th>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Amount</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {INVOICES.map((invoice) => {
              const StatusIcon = getStatusIcon(invoice.status);
              return (
                <tr key={invoice.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                    {invoice.id.toUpperCase()}
                  </td>
                  <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300">
                    {invoice.client}
                  </td>
                  <td className="px-6 py-4 text-neutral-500">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-neutral-900 dark:text-white">
                    ${invoice.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize",
                      getStatusColor(invoice.status)
                    )}>
                      <StatusIcon className="w-3.5 h-3.5" />
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
