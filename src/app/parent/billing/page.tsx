"use client";

import { CreditCard, Download, ArrowUpRight, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp, History, Receipt, FileText } from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useClientInvoices } from "@/hooks/useCollections";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoiceGenerator";
import { useState, useMemo } from "react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

export default function ParentBillingPage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: client, loading: portalLoading, error: portalError } = usePortalData();
  const { data: invoices, loading: invoicesLoading } = useClientInvoices(client?.id || "");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loading = portalLoading || invoicesLoading;
  const error = portalError;

  const balance = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === "issued" || inv.status === "overdue")
      .reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  const pendingInvoices = useMemo(() => invoices.filter((inv) => inv.status !== "paid"), [invoices]);
  const paidInvoices = useMemo(() => invoices.filter((inv) => inv.status === "paid"), [invoices]);

  // Group paid invoices by month
  const groupedPaidInvoices = useMemo(() => {
    const groups: Record<string, typeof paidInvoices> = {};
    paidInvoices.forEach((inv) => {
      const date = new Date(inv.date);
      const key = date.toLocaleDateString(currentLang, { month: "long", year: "numeric" });
      if (!groups[key]) groups[key] = [];
      groups[key].push(inv);
    });
    return groups;
  }, [paidInvoices, currentLang]);

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || t("parent_portal.dashboard.load_error")} />;

  const handleDownload = async (invoice: any) => {
    setDownloadingId(invoice.id);
    try {
      const invoiceData: InvoiceData = {
        series: invoice.series,
        number: invoice.number,
        date: invoice.date,
        dueDate: invoice.dueDate,
        clinic: invoice.clinic,
        client: invoice.client,
        items: invoice.items,
        total: invoice.total,
        currency: invoice.currency,
      };

      const prettyData = {
        ...invoiceData,
        date: new Date(invoice.date).toLocaleDateString("ro-RO"),
        dueDate: new Date(invoice.dueDate).toLocaleDateString("ro-RO"),
      };

      const pdfBlob = await generateInvoicePDF(prettyData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Factura_${invoice.series}${invoice.number}_${new Date(invoice.date).toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert(t("parent_portal.billing.download_error"));
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusBadge = (inv: any) => {
    const now = new Date();
    const dueDate = new Date(inv.dueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

    if (inv.status === "paid") {
      return { label: t("parent_portal.billing.paid"), color: "bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400" };
    }
    if (inv.status === "overdue" || daysUntilDue < 0) {
      return { label: t("parent_portal.billing.overdue"), color: "bg-error-50 text-error-700 dark:bg-error-900/20 dark:text-error-400" };
    }
    if (daysUntilDue <= 7) {
      return { label: t("parent_portal.billing.due_soon"), color: "bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400" };
    }
    return { label: t("parent_portal.billing.unpaid"), color: "bg-neutral-50 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" };
  };

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-300 pb-20 font-sans">
      <header>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{t("parent_portal.billing.title")}</h1>
        <p className="text-neutral-400 text-sm">{t("parent_portal.billing.subtitle")}</p>
      </header>

      {/* Balance Card */}
      <div
        className={clsx(
          "rounded-2xl border p-5 shadow-sm overflow-hidden relative",
          balance > 0
            ? "bg-gradient-to-br from-warning-50 to-warning-100/50 border-warning-200 dark:from-warning-900/10 dark:to-warning-900/5 dark:border-warning-900/30"
            : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
        )}
      >
        <div className="flex flex-col items-center text-center space-y-2 py-3">
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">
            {t("parent_portal.billing.current_balance")}
          </p>
          <h2 className="text-4xl font-black text-neutral-900 dark:text-white">{balance.toFixed(2)} RON</h2>
          <div
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
              balance > 0
                ? "bg-warning-100 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400"
                : "bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
            )}
          >
            {balance > 0 ? (
              <>
                <Clock className="w-3 h-3" /> {t("parent_portal.billing.payment_pending")}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3" /> {t("parent_portal.billing.all_paid")}
              </>
            )}
          </div>
        </div>

        {balance > 0 && (
          <button
            onClick={() => alert(t("parent_portal.billing.online_payments_soon"))}
            className="w-full mt-4 py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20"
          >
            {t("parent_portal.billing.pay_online")}
            <ArrowUpRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Outstanding Invoices */}
      {pendingInvoices.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-neutral-900 dark:text-white px-1 text-sm">
            {t("parent_portal.billing.payment_required")}
          </h3>
          <div className="space-y-2">
            {pendingInvoices.map((inv) => {
              const status = getStatusBadge(inv);
              const isExpanded = expandedId === inv.id;

              return (
                <div
                  key={inv.id}
                  className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden"
                >
                  <div className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-900/20 text-warning-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {t("parent_portal.billing.invoice")} #{inv.series}-{inv.number}
                      </p>
                      <p className="text-xs text-neutral-400">
                        {t("parent_portal.billing.due")}: {new Date(inv.dueDate).toLocaleDateString(currentLang)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">{inv.total.toFixed(2)} RON</p>
                      <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", status.color)}>
                        {status.label}
                      </span>
                    </div>
                  </div>

                  {/* Expandable line items */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800 flex">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      className="flex-1 px-4 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {t("parent_portal.billing.line_items")}
                    </button>
                    <div className="w-px bg-neutral-100 dark:bg-neutral-800" />
                    <button
                      onClick={() => handleDownload(inv)}
                      disabled={downloadingId === inv.id}
                      className="px-4 py-2.5 flex items-center justify-center gap-1.5 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors"
                    >
                      {downloadingId === inv.id ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      PDF
                    </button>
                  </div>

                  {isExpanded && inv.items && (
                    <div className="px-4 pb-4 animate-in slide-in-from-top-2 duration-200">
                      <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl overflow-hidden">
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                          {inv.items.map((item: any, idx: number) => (
                            <div key={idx} className="px-3 py-2.5 flex items-center justify-between text-xs">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-neutral-700 dark:text-neutral-300 truncate">{item.name || item.description}</p>
                                <p className="text-neutral-400">
                                  {item.quantity} x {item.unitPrice?.toFixed(2) || item.price?.toFixed(2)} RON
                                </p>
                              </div>
                              <p className="font-bold text-neutral-900 dark:text-white ml-3">
                                {((item.quantity || 1) * (item.unitPrice || item.price || 0)).toFixed(2)} RON
                              </p>
                            </div>
                          ))}
                        </div>
                        <div className="px-3 py-2.5 border-t border-neutral-200 dark:border-neutral-700 flex items-center justify-between text-xs font-bold">
                          <span className="text-neutral-600 dark:text-neutral-300">{t("parent_portal.billing.total")}</span>
                          <span className="text-neutral-900 dark:text-white">{inv.total.toFixed(2)} RON</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Paid History */}
      <section className="space-y-3">
        <h3 className="font-semibold text-neutral-900 dark:text-white px-1 text-sm flex items-center gap-2">
          <History className="w-4 h-4 text-neutral-400" />
          {t("parent_portal.billing.paid_history")}
        </h3>

        {paidInvoices.length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedPaidInvoices).map(([month, monthInvoices]) => (
              <div key={month}>
                <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2 px-1">{month}</p>
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
                  <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {monthInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="p-3.5 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-success-50 dark:bg-success-900/20 text-success-600 flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-neutral-900 dark:text-white">
                              #{inv.series}-{inv.number}
                            </p>
                            <p className="text-[10px] text-neutral-400">
                              {new Date(inv.date).toLocaleDateString(currentLang)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">{inv.total.toFixed(2)} RON</p>
                          <button
                            onClick={() => handleDownload(inv)}
                            className="text-neutral-400 hover:text-primary-600 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-neutral-300 dark:text-neutral-600" />
            <p className="text-sm text-neutral-400">{t("parent_portal.billing.no_history")}</p>
          </div>
        )}
      </section>

      <p className="text-[10px] text-neutral-400 text-center px-6 leading-relaxed">
        {t("parent_portal.billing.disclaimer")}
      </p>
    </div>
  );
}
