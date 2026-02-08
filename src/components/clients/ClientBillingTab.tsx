"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { 
  CreditCard, 
  Plus, 
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
  Trash2
} from "lucide-react";
import { clsx } from "clsx";
import { useClientInvoices } from "@/hooks/useCollections";
import { useToast } from "@/context/ToastContext";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useTranslation } from "react-i18next";
import { notifyParentInvoiceGenerated } from "@/lib/notificationService";
import { useAuth } from "@/context/AuthContext";

interface ClientBillingTabProps {
  client: any;
}

export default function ClientBillingTab({ client }: ClientBillingTabProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { user: authUser } = useAuth();
  const { data: invoices, loading: invoicesLoading } = useClientInvoices(client.id);
  
  const [isSavingSubscription, setIsSavingSubscription] = useState(false);
  const [subscriptionEnabled, setSubscriptionEnabled] = useState(client.hasActiveSubscription || false);
  const [subscriptionPrice, setSubscriptionPrice] = useState(client.subscriptionPrice || 0);
  
  // Menu Logic
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);

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

  const handleSaveSubscription = async () => {
    setIsSavingSubscription(true);
    try {
      const clientRef = doc(db, "clients", client.id);
      await updateDoc(clientRef, {
        hasActiveSubscription: subscriptionEnabled,
        subscriptionPrice: Number(subscriptionPrice)
      });
      success("Subscription settings updated");
    } catch (err) {
      console.error(err);
      error("Failed to update subscription");
    } finally {
      setIsSavingSubscription(false);
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "invoices", invoiceId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      success(`Invoice status updated to ${newStatus}`);
      closeMenu();
    } catch (err) {
      error("Failed to update status");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm("Are you sure you want to delete this invoice? This action cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
      success("Invoice deleted successfully");
      closeMenu();
    } catch (err) {
      error("Failed to delete invoice");
    }
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
      success("Invoice shared with parent");
      closeMenu();
    } catch (err) {
      error("Failed to share invoice");
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
      
      {/* Subscription Settings */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Subscription Plan</h3>
            <p className="text-sm text-neutral-500">Manage fixed monthly billing for this client</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">Active Subscription</p>
                <p className="text-xs text-neutral-500">Invoice a fixed amount monthly instead of per session</p>
              </div>
              <button
                onClick={() => setSubscriptionEnabled(!subscriptionEnabled)}
                className={clsx(
                  "w-12 h-6 rounded-full transition-colors relative flex-shrink-0",
                  subscriptionEnabled ? "bg-primary-500" : "bg-neutral-300 dark:bg-neutral-700"
                )}
              >
                <div className={clsx(
                  "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                  subscriptionEnabled ? "translate-x-6" : "translate-x-0"
                )} />
              </button>
            </div>

            <div className={clsx("transition-all duration-300", !subscriptionEnabled && "opacity-50 pointer-events-none")}>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Monthly Price (RON)</label>
              <input
                type="number"
                value={subscriptionPrice}
                onChange={(e) => setSubscriptionPrice(Number(e.target.value))}
                className="w-full px-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors font-bold text-lg"
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSaveSubscription}
              disabled={isSavingSubscription}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70"
            >
              {isSavingSubscription ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
              Save Billing Settings
            </button>
          </div>
        </div>
      </div>

      {/* Invoice History */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-neutral-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white">Invoice History</h3>
          </div>
          <span className="text-xs font-medium text-neutral-500">{invoices?.length || 0} Invoices</span>
        </div>

        {invoicesLoading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : !invoices || invoices.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <FileText className="w-12 h-12 text-neutral-200 mx-auto" />
            <p className="text-neutral-500 italic">No invoices issued for this client yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 dark:bg-neutral-800 text-neutral-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                  <th className="px-6 py-3 text-right">Actions</th>
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
              Share with Parent
            </button>
            <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
            {activeInvoice.status !== 'paid' && (
              <button 
                onClick={() => handleUpdateInvoiceStatus(activeInvoice.id, 'paid')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Mark as Paid
              </button>
            )}
            {activeInvoice.status === 'paid' && (
              <button 
                onClick={() => handleUpdateInvoiceStatus(activeInvoice.id, 'issued')}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-warning-600 hover:bg-warning-50 dark:hover:bg-warning-900/20 transition-colors"
              >
                <Clock className="w-4 h-4" />
                Mark as Pending
              </button>
            )}
            <button 
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download PDF
            </button>
            <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />
            <button 
              onClick={() => handleDeleteInvoice(activeInvoice.id)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete Invoice (Storno)
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Helper info */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
        <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-bold mb-1">About Subscription Billing</p>
          <p>When an active subscription is set, the system will automatically use the fixed monthly price for invoice generation on the main Billing page, regardless of the number or type of sessions attended.</p>
        </div>
      </div>
    </div>
  );
}
