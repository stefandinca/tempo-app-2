"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  MoreVertical,
  Loader2
} from "lucide-react";
import { clsx } from "clsx";
import { ClientInvoice } from "@/lib/billing";

interface ClientInvoicesTableProps {
  invoices: ClientInvoice[];
  loading?: boolean;
  onMarkAsPaid?: (clientId: string) => void;
  onMarkAsPending?: (clientId: string) => void;
}

export default function ClientInvoicesTable({
  invoices,
  loading,
  onMarkAsPaid,
  onMarkAsPending
}: ClientInvoicesTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null);

  const toggleRow = (clientId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedRows(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("ro-RO", {
      day: "2-digit",
      month: "short"
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "paid":
        return {
          icon: CheckCircle,
          label: "Paid",
          classes: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400"
        };
      case "overdue":
        return {
          icon: AlertTriangle,
          label: "Overdue",
          classes: "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400"
        };
      default:
        return {
          icon: Clock,
          label: "Pending",
          classes: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
        };
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center">
        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
          No billable sessions
        </h3>
        <p className="text-neutral-500">
          There are no completed sessions to bill for this period.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
            <tr>
              <th className="px-6 py-3 w-8"></th>
              <th className="px-6 py-3">Client</th>
              <th className="px-6 py-3 text-center">Sessions</th>
              <th className="px-6 py-3 text-center">Hours</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 text-center">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {invoices.map((invoice) => {
              const isExpanded = expandedRows.has(invoice.clientId);
              const statusConfig = getStatusConfig(invoice.status);
              const StatusIcon = statusConfig.icon;

              return (
                <>
                  {/* Main Row */}
                  <tr
                    key={invoice.clientId}
                    className={clsx(
                      "hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer",
                      isExpanded && "bg-neutral-50 dark:bg-neutral-800/30"
                    )}
                    onClick={() => toggleRow(invoice.clientId)}
                  >
                    <td className="px-6 py-4">
                      <button className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-neutral-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-neutral-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {invoice.clientName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">
                      {invoice.billableSessions}
                      {invoice.excusedSessions > 0 && (
                        <span className="text-xs text-neutral-400 ml-1">
                          (+{invoice.excusedSessions} excused)
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">
                      {invoice.totalHours}h
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-neutral-900 dark:text-white">
                        {formatCurrency(invoice.total)} RON
                      </span>
                      {invoice.discount > 0 && (
                        <span className="block text-xs text-success-600">
                          -{formatCurrency(invoice.discount)} discount
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold",
                          statusConfig.classes
                        )}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="relative inline-block">
                        <button
                          onClick={() =>
                            setActionMenuOpen(
                              actionMenuOpen === invoice.clientId ? null : invoice.clientId
                            )
                          }
                          className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {actionMenuOpen === invoice.clientId && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                            {invoice.status === "paid" ? (
                              <button
                                onClick={() => {
                                  onMarkAsPending?.(invoice.clientId);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                              >
                                <Clock className="w-4 h-4" />
                                Mark Pending
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  onMarkAsPaid?.(invoice.clientId);
                                  setActionMenuOpen(null);
                                }}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Mark as Paid
                              </button>
                            )}
                            <button
                              onClick={() => setActionMenuOpen(null)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                            >
                              <FileText className="w-4 h-4" />
                              View Details
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Details Row */}
                  {isExpanded && (
                    <tr key={`${invoice.clientId}-details`}>
                      <td colSpan={7} className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/20">
                        <div className="pl-8 space-y-2">
                          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                            Session Breakdown
                          </p>
                          <div className="grid gap-2">
                            {invoice.lineItems.map((item, idx) => (
                              <div
                                key={idx}
                                className={clsx(
                                  "flex items-center justify-between py-2 px-3 rounded-lg border",
                                  item.isBillable
                                    ? "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800"
                                    : "bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 opacity-60"
                                )}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-sm text-neutral-500 w-20">
                                    {formatDate(item.date)}
                                  </span>
                                  <span className="text-sm text-neutral-500 w-16">
                                    {formatTime(item.date)}
                                  </span>
                                  <span className="text-sm font-medium text-neutral-900 dark:text-white">
                                    {item.serviceLabel}
                                  </span>
                                  <span className="text-xs text-neutral-400">
                                    ({item.duration} min)
                                  </span>
                                  {item.attendance && (
                                    <span className={clsx(
                                      "text-xs px-1.5 py-0.5 rounded font-medium",
                                      item.attendance === "present" && "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400",
                                      item.attendance === "absent" && "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400",
                                      item.attendance === "excused" && "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400"
                                    )}>
                                      {item.attendance === "present" && "Present"}
                                      {item.attendance === "absent" && "No-show"}
                                      {item.attendance === "excused" && "Excused"}
                                    </span>
                                  )}
                                </div>
                                <span className={clsx(
                                  "text-sm font-medium",
                                  item.isBillable
                                    ? "text-neutral-700 dark:text-neutral-300"
                                    : "text-neutral-400 line-through"
                                )}>
                                  {item.isBillable
                                    ? `${formatCurrency(item.amount)} RON`
                                    : "Not billed"
                                  }
                                </span>
                              </div>
                            ))}
                          </div>
                          {invoice.discount > 0 && (
                            <div className="flex items-center justify-between py-2 px-3 mt-2 border-t border-neutral-200 dark:border-neutral-700">
                              <span className="text-sm text-neutral-500">Subtotal</span>
                              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                                {formatCurrency(invoice.subtotal)} RON
                              </span>
                            </div>
                          )}
                          {invoice.discount > 0 && (
                            <div className="flex items-center justify-between py-2 px-3">
                              <span className="text-sm text-success-600">Discount</span>
                              <span className="text-sm text-success-600">
                                -{formatCurrency(invoice.discount)} RON
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
