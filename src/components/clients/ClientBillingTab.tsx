"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard,
  Loader2,
  FileText,
  CheckCircle,
  Clock,
  Share2,
  Download,
  MoreVertical,
  AlertCircle,
  TrendingUp,
  History,
  Trash2,
  Tag
} from "lucide-react";
import { clsx } from "clsx";
import { useClientInvoices } from "@/hooks/useCollections";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { notifyParentInvoiceGenerated } from "@/lib/notificationService";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/context/ConfirmContext";

interface ClientBillingTabProps {
  client: any;
}

export default function ClientBillingTab({ client }: ClientBillingTabProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { user: authUser } = useAuth();
  const { confirm: customConfirm } = useConfirm();
  const { data: invoices, loading: invoicesLoading } = useClientInvoices(client.id);

  const [isSaving, setIsSaving] = useState(false);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(client.hasActiveSubscription || false);
  const [subscriptionPrice, setSubscriptionPrice] = useState(client.subscriptionPrice || 0);
  const [fixedSessionPriceEnabled, setFixedSessionPriceEnabled] = useState((client.fixedSessionPrice || 0) > 0);
  const [fixedSessionPrice, setFixedSessionPrice] = useState(client.fixedSessionPrice || 0);

  // Menu Logic
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

  const handleToggleSubscription = () => {
    const newVal = !subscriptionEnabled;
    setSubscriptionEnabled(newVal);
    if (newVal) {
      // Disable fixed session price when subscription is enabled
      setFixedSessionPriceEnabled(false);
      setFixedSessionPrice(0);
    }
  };

  const handleToggleFixedSessionPrice = () => {
    const newVal = !fixedSessionPriceEnabled;
    setFixedSessionPriceEnabled(newVal);
    if (newVal) {
      // Disable subscription when fixed session price is enabled
      setSubscriptionEnabled(false);
      setSubscriptionPrice(0);
    }
  };

  const handleMenuClick = (e: React.MouseEvent, inv: any) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveInvoice(inv);
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right
    });
  };

  const closeMenu = () => {
    setMenuPosition(null);
    setActiveInvoice(null);
  };

  const handleSaveBillingSettings = async () => {
    setIsSaving(true);
    try {
      const clientRef = doc(db, "clients", client.id);
      await updateDoc(clientRef, {
        hasActiveSubscription: subscriptionEnabled,
        subscriptionPrice: subscriptionEnabled ? Number(subscriptionPrice) : 0,
        fixedSessionPrice: fixedSessionPriceEnabled ? Number(fixedSessionPrice) : 0
      });
      success(t('billing_page.client_billing.settings_updated'));
    } catch (err) {
      console.error(err);
      error(t('billing_page.client_billing.settings_update_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      success(t('billing_page.client_billing.status_updated'));
      closeMenu();
    } catch (err) {
      error(t('billing_page.client_billing.status_update_error'));
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    customConfirm({
      title: t('billing_page.client_billing.delete_confirm_title'),
      message: t('billing_page.client_billing.delete_confirm_message'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "invoices", invoiceId));
          success(t('billing_page.client_billing.invoice_deleted'));
          closeMenu();
        } catch (err) {
          error(t('billing_page.client_billing.invoice_delete_error'));
        }
      }
    });
  };

  const handleShareInvoice = async (invoice: any) => {
    if (!authUser) return;
    try {
      const periodStr = new Date(invoice.date).toLocaleDateString("en-US", { month: "long", year: "numeric" });
      await notifyParentInvoiceGenerated(client.id, {
        amount: invoice.total,
        period: periodStr,
        invoiceId: invoice.id,
        triggeredByUserId: authUser.uid
      });
      success(t('billing_page.client_billing.invoice_shared'));
      closeMenu();
    } catch (err) {
      error(t('billing_page.client_billing.invoice_share_error'));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400";
      case "issued": return "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400";
      default: return "bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400";
    }
  };

  return (
    <div className="space-y-6">

      {/* Billing Settings Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('billing_page.client_billing.billing_settings')}</h3>
            <p className="text-sm text-neutral-500">{t('billing_page.client_billing.subscription_description')}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Subscription Toggle */}
          <div className={clsx(
            "flex items-center justify-between p-4 rounded-xl border transition-all",
            fixedSessionPriceEnabled
              ? "bg-neutral-50/50 dark:bg-neutral-800/30 border-neutral-100 dark:border-neutral-800 opacity-50"
              : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800"
          )}>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-white">{t('billing_page.client_billing.active_subscription')}</p>
              <p className="text-xs text-neutral-500">{t('billing_page.client_billing.subscription_toggle_description')}</p>
            </div>
            <button
              onClick={handleToggleSubscription}
              disabled={fixedSessionPriceEnabled}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative flex-shrink-0",
                subscriptionEnabled ? "bg-primary-500" : "bg-neutral-300 dark:bg-neutral-700",
                fixedSessionPriceEnabled && "cursor-not-allowed"
              )}
            >
              <div className={clsx(
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                subscriptionEnabled ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Subscription Price Input */}
          <div className={clsx("transition-all duration-300 pl-4", !subscriptionEnabled && "opacity-50 pointer-events-none")}>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('billing_page.client_billing.monthly_price')}</label>
            <input
              type="number"
              value={subscriptionPrice}
              onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
              className="w-full max-w-xs px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors font-bold text-lg"
              placeholder="0.00"
              min="0"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-neutral-100 dark:border-neutral-800" />

          {/* Fixed Session Price Toggle */}
          <div className={clsx(
            "flex items-center justify-between p-4 rounded-xl border transition-all",
            subscriptionEnabled
              ? "bg-neutral-50/50 dark:bg-neutral-800/30 border-neutral-100 dark:border-neutral-800 opacity-50"
              : "bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800"
          )}>
            <div>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{t('billing_page.client_billing.fixed_session_price_toggle')}</p>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">{t('billing_page.client_billing.fixed_session_price_toggle_description')}</p>
            </div>
            <button
              onClick={handleToggleFixedSessionPrice}
              disabled={subscriptionEnabled}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative flex-shrink-0",
                fixedSessionPriceEnabled ? "bg-amber-500" : "bg-neutral-300 dark:bg-neutral-700",
                subscriptionEnabled && "cursor-not-allowed"
              )}
            >
              <div className={clsx(
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                fixedSessionPriceEnabled ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Fixed Session Price Input */}
          <div className={clsx("transition-all duration-300 pl-4", !fixedSessionPriceEnabled && "opacity-50 pointer-events-none")}>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('billing_page.client_billing.price_per_session')}</label>
            <input
              type="number"
              value={fixedSessionPrice}
              onChange={(e) => setFixedSessionPrice(Number(e.target.value))}
              className="w-full max-w-xs px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-amber-500 transition-colors font-bold text-lg"
              placeholder="0.00"
              min="0"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleSaveBillingSettings}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            {t('billing_page.client_billing.save_billing_settings')}
          </button>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">{t('billing_page.client_billing.invoice_history')}</h3>
          </div>
          <span className="text-xs font-medium text-neutral-500">{t('billing_page.client_billing.invoices_count', { count: invoices?.length || 0 })}</span>
        </div>

        {invoicesLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileText className="w-12 h-12 text-neutral-200 mx-auto" />
            <p className="text-neutral-500 italic">{t('billing_page.client_billing.no_invoices_yet')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-3">{t('billing_page.table.client')}</th>
                  <th className="px-6 py-3">{t('billing_page.table.status')}</th>
                  <th className="px-6 py-3 text-right">{t('billing_page.table.amount')}</th>
                  <th className="px-6 py-3 text-center">{t('billing_page.table.status')}</th>
                  <th className="px-6 py-3 text-right">{t('billing_page.table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-primary-600">
                      {inv.series}-{inv.number}
                    </td>
                    <td className="px-6 py-4 text-neutral-600 dark:text-neutral-400">
                      {new Date(inv.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-neutral-900 dark:text-white">
                      {inv.total.toFixed(2)} RON
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={clsx("px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider", getStatusColor(inv.status))}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => handleMenuClick(e, inv)}
                        className={clsx(
                          "p-2 rounded-lg transition-colors",
                          activeInvoice?.id === inv.id
                            ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
                            : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        )}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Portalled Menu */}
      {menuPosition && activeInvoice && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-transparent" onClick={closeMenu} />
          <div
            className="fixed z-[101] w-48 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
              top: menuPosition.top,
              right: menuPosition.right
            }}
          >
            <button
              onClick={() => handleShareInvoice(activeInvoice)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Share2 className="w-4 h-4 text-primary-500" />
              {t('billing_page.client_billing.share_with_parent')}
            </button>
            <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
            {activeInvoice.status !== 'paid' && (
              <button
                onClick={() => handleUpdateInvoiceStatus(activeInvoice.id, 'paid')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                {t('billing_page.client_billing.mark_as_paid')}
              </button>
            )}
            {activeInvoice.status === 'paid' && (
              <button
                onClick={() => handleUpdateInvoiceStatus(activeInvoice.id, 'issued')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors"
              >
                <Clock className="w-4 h-4" />
                {t('billing_page.client_billing.mark_as_pending')}
              </button>
            )}
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              {t('billing_page.client_billing.download_pdf')}
            </button>
            <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
            <button
              onClick={() => handleDeleteInvoice(activeInvoice.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              {t('billing_page.client_billing.delete_invoice_storno')}
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Helper info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-bold mb-1">{t('billing_page.client_billing.about_billing_modes')}</p>
          <p>{t('billing_page.client_billing.billing_modes_info')}</p>
        </div>
      </div>
    </div>
  );
}
