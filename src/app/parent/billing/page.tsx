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
  const currentLang = i18n.language.startsWith('ro') ? 'ro-RO' : 'en-US';
  const { data: client, loading: portalLoading, error: portalError } = usePortalData();
  const { data: invoices, loading: invoicesLoading } = useClientInvoices(client?.id || "");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const loading = portalLoading || invoicesLoading;
  const error = portalError;

  // Calculate Balance from Real Invoices (Move hooks before conditional returns)
  const balance = useMemo(() => {
    return invoices
      .filter(inv => inv.status === 'issued' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  const pendingInvoices = useMemo(() => invoices.filter(inv => inv.status !== 'paid'), [invoices]);
  const paidInvoices = useMemo(() => invoices.filter(inv => inv.status === 'paid'), [invoices]);

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || "Could not load billing data."} />;

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
        currency: invoice.currency
      };

      const prettyData = {
        ...invoiceData,
        date: new Date(invoice.date).toLocaleDateString("ro-RO"),
        dueDate: new Date(invoice.dueDate).toLocaleDateString("ro-RO")
      };

      const pdfBlob = await generateInvoicePDF(prettyData);
      
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.series}${invoice.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed", err);
      alert(t('parent_portal.billing.download_error'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-20 font-sans">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('parent_portal.billing.title')}</h1>
        <p className="text-neutral-500 text-sm">{t('parent_portal.billing.subtitle')}</p>
      </header>

      {/* 1. Balance Summary */}
      <div className={clsx(
        "rounded-3xl border p-6 shadow-sm overflow-hidden relative",
        balance > 0 ? "bg-warning-50 border-warning-100 dark:bg-warning-900/10 dark:border-warning-900/30" : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
      )}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Receipt className="w-24 h-24" />
        </div>
        
        <div className="flex flex-col items-center text-center space-y-2 py-4">
          <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{t('parent_portal.billing.current_balance')}</p>
          <h2 className="text-5xl font-black text-neutral-900 dark:text-white">
            {balance.toFixed(2)} RON
          </h2>
          <div className={clsx(
            "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
            balance > 0 ? "bg-warning-100 text-warning-700" : "bg-success-50 text-success-700 dark:bg-success-900/20 dark:text-success-400"
          )}>
            {balance > 0 ? (
              <><Clock className="w-3 h-3" /> {t('parent_portal.billing.payment_pending')}</>
            ) : (
              <><CheckCircle2 className="w-3 h-3" /> {t('parent_portal.billing.all_paid')}</>
            )}
          </div>
        </div>

        {balance > 0 && (
          <button 
            onClick={() => alert(t('parent_portal.billing.online_payments_soon'))}
            className="w-full mt-6 py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20"
          >
            {t('parent_portal.billing.pay_online')}
            <ArrowUpRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 2. Outstanding Invoices */}
      {pendingInvoices.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-bold text-neutral-900 dark:text-white px-2">{t('parent_portal.billing.payment_required')}</h3>
          <div className="space-y-3">
            {pendingInvoices.map((inv) => (
              <div key={inv.id} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning-50 dark:bg-warning-900/20 text-warning-600 flex items-center justify-center">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{t('parent_portal.billing.invoice')} #{inv.series}-{inv.number}</p>
                    <p className="text-xs text-neutral-500">{t('parent_portal.billing.issued')}: {new Date(inv.date).toLocaleDateString(currentLang)}</p>
                    <p className="text-xs text-error-500 font-medium">{t('parent_portal.billing.due')}: {new Date(inv.dueDate).toLocaleDateString(currentLang)}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t sm:border-0 border-neutral-100 dark:border-neutral-800 pt-3 sm:pt-0">
                  <div className="text-right">
                    <p className="text-sm font-black text-neutral-900 dark:text-white">{inv.total.toFixed(2)} RON</p>
                    <span className="text-[10px] font-bold uppercase text-warning-600">{t('parent_portal.billing.unpaid')}</span>
                  </div>
                  <button
                    onClick={() => handleDownload(inv)}
                    disabled={downloadingId === inv.id}
                    className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl text-neutral-600 dark:text-neutral-300 transition-colors"
                    title="Download PDF"
                  >
                    {downloadingId === inv.id ? <Clock className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. Invoice History */}
      <section className="space-y-4">
        <h3 className="font-bold text-neutral-900 dark:text-white px-2 flex items-center gap-2">
          <History className="w-4 h-4 text-neutral-400" />
          {t('parent_portal.billing.paid_history')}
        </h3>
        
        {paidInvoices.length > 0 ? (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden">
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {paidInvoices.map((inv) => (
                <div key={inv.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-success-50 dark:bg-success-900/20 text-success-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">#{inv.series}-{inv.number}</p>
                      <p className="text-xs text-neutral-500">{new Date(inv.date).toLocaleDateString(currentLang)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
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
        ) : (
          <div className="text-center py-10 opacity-50">
            <Receipt className="w-12 h-12 mx-auto mb-2 text-neutral-300" />
            <p className="text-sm text-neutral-500">{t('parent_portal.billing.no_history')}</p>
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <p className="text-[10px] text-neutral-400 text-center px-6 leading-relaxed">
        {t('parent_portal.billing.disclaimer')}
      </p>
    </div>
  );
}