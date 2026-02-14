"use client";

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle,
  Clock,
  FileText,
  MoreVertical,
  Loader2,
  Download,
  RefreshCw,
  Trash2,
  Zap,
  Building,
  X,
  Search
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { ClientInvoice } from "@/lib/billing";
import { useSystemSettings } from "@/hooks/useCollections";
import { generateInvoicePDF, InvoiceData } from "@/lib/invoiceGenerator";
import { useToast } from "@/context/ToastContext";
import { db, IS_DEMO } from "@/lib/firebase";
import { doc, runTransaction, serverTimestamp, collection, getDocs, query, where, getDoc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { createNotificationsBatch, notifyParentInvoiceGenerated } from "@/lib/notificationService";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";

interface ClientInvoicesTableProps {
  invoices: ClientInvoice[];
  loading?: boolean;
  onMarkAsPaid?: (clientId: string) => void;
  onMarkAsPending?: (clientId: string) => void;
  onDeleteInvoice?: (invoiceId: string) => void;
}

const currencyFormatter = new Intl.NumberFormat("ro-RO", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

export default function ClientInvoicesTable({
  invoices,
  loading,
  onMarkAsPaid,
  onMarkAsPending,
  onDeleteInvoice
}: ClientInvoicesTableProps) {
  const { t } = useTranslation();
  const { data: settings } = useSystemSettings();
  const { success, error } = useToast();
  const { user: authUser } = useAuth();
  const { confirm: customConfirm } = useConfirm();
  
  const [searchQuery, setSearchQuery] = useState("");

  // Dropdown Logic
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const [smartBillSyncingId, setSmartBillSyncingId] = useState<string | null>(null);
  
  // Entity Selection Modal
  const [showEntitySelector, setShowEntitySelector] = useState(false);
  const [pendingInvoice, setPendingInvoice] = useState<ClientInvoice | null>(null);

  const filteredInvoices = useMemo(() =>
    invoices.filter(inv =>
      inv.clientName.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  [invoices, searchQuery]);

  const handleMenuClick = (e: React.MouseEvent, invoice: ClientInvoice) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActiveInvoice(invoice);
    setMenuPosition({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right
    });
  };

  const closeMenu = () => {
    setMenuPosition(null);
    setActiveInvoice(null);
  };

  const formatCurrency = (amount: number) => currencyFormatter.format(amount);
  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" });
  const formatTime = (dateStr: string) => new Date(dateStr).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" });

  const handleSyncToSmartBill = async (invoice: ClientInvoice) => {
    if (IS_DEMO) {
      error(t('common.demo_restriction') || "SmartBill sync is disabled in Demo mode.");
      return;
    }
    if (!invoice.invoiceId) {
      error(t('billing_page.errors.generate_local_first') || "Please generate a local invoice first.");
      return;
    }
    setSmartBillSyncingId(invoice.clientId);
    closeMenu();
    try {
      const invRef = doc(db, "invoices", invoice.invoiceId);
      const invSnap = await getDoc(invRef);
      if (!invSnap.exists()) throw new Error(t('billing_page.errors.settings_not_found'));
      const invData = invSnap.data();
      const payload = {
        invoiceId: invoice.invoiceId,
        clientId: invoice.clientId,
        items: invData.items,
        total: invData.total,
        series: invData.series,
        clinicCif: invData.clinic?.cui
      };
      const response = await fetch('/api/smartbill/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sync failed");
      success(`${t('billing_page.status.synced')}: #${result.result.series}${result.result.number}`);
    } catch (err: any) {
      console.error(err);
      error(t('billing_page.errors.smartbill_sync') + ": " + err.message);
    } finally {
      setSmartBillSyncingId(null);
    }
  };

  const initiateInvoiceGeneration = (invoice: ClientInvoice) => {
    const legalEntities = settings?.legalEntities || [];
    const entityCount = legalEntities.length || (settings?.clinic ? 1 : 0);
    if (entityCount > 1) {
      setPendingInvoice(invoice);
      setShowEntitySelector(true);
      closeMenu();
    } else {
      const defaultEntity = legalEntities.find((e: any) => e.id === settings?.defaultEntityId) || legalEntities[0] || settings?.clinic;
      handleGenerateInvoice(invoice, defaultEntity);
    }
  };

  const handleGenerateInvoice = async (invoice: ClientInvoice, selectedEntity?: any) => {
    if (!selectedEntity && !settings?.clinic && (!settings?.legalEntities || settings?.legalEntities.length === 0)) {
      error(t('billing_page.errors.configure_clinic'));
      return;
    }
    const entityToUse = selectedEntity || (settings?.legalEntities?.find((e: any) => e.id === settings?.defaultEntityId) || settings?.legalEntities?.[0] || settings?.clinic);
    setGeneratingId(invoice.clientId);
    setShowEntitySelector(false);
    closeMenu();
    try {
      const clientSnap = await getDoc(doc(db, "clients", invoice.clientId));
      const clientData = clientSnap.exists() ? clientSnap.data() : {};
      const invoiceData = await runTransaction(db, async (transaction) => {
        const settingsRef = doc(db, "system_settings", "config");
        const settingsDoc = await transaction.get(settingsRef);
        if (!settingsDoc.exists()) throw new Error(t('billing_page.errors.settings_not_found'));
        const currentSettings = settingsDoc.data();
        const nextNumber = (currentSettings.invoicing?.currentNumber || 0) + 1;
        const series = currentSettings.invoicing?.seriesPrefix || "INV";
        const vatRate = currentSettings.invoicing?.vatRate || 0;
        const today = new Date();
        const dueDate = new Date();
        dueDate.setDate(today.getDate() + (currentSettings.invoicing?.defaultDueDays || 14));
        const isSubscription = clientData.hasActiveSubscription === true;
        const periodName = today.toLocaleDateString("ro-RO", { month: "long", year: "numeric" });
        const items = isSubscription 
          ? [{ description: `${t('billing_page.subscription_label')} - ${periodName}`, quantity: 1, unit: "buc", price: clientData.subscriptionPrice || 0, amount: clientData.subscriptionPrice || 0 }]
          : invoice.lineItems.map(item => ({ description: `${item.serviceLabel} (${formatDate(item.date)})`, quantity: item.duration / 60, unit: "hour", price: item.basePrice, amount: item.amount }));
        const totalAmount = isSubscription ? (clientData.subscriptionPrice || 0) : invoice.total;
        const snapshot: InvoiceData = {
          series, number: nextNumber, date: today.toISOString().split('T')[0], dueDate: dueDate.toISOString().split('T')[0],
          clinic: {
            name: entityToUse.name || "Clinic Name", address: entityToUse.address || "", cui: entityToUse.cui || "",
            regNo: entityToUse.regNo || "", bank: entityToUse.bank || "", iban: entityToUse.iban || "",
            email: entityToUse.email || "", phone: entityToUse.phone || "",
          },
          client: {
            name: invoice.clientName, cif: clientData.billingCif || "", regNo: clientData.billingRegNo || "",
            address: clientData.billingAddress || "Client Address Placeholder",
          },
          items, total: totalAmount, currency: "RON", vatRate
        };
        const newInvoiceRef = doc(collection(db, "invoices"));
        transaction.set(newInvoiceRef, {
          ...snapshot, clientId: invoice.clientId, status: "issued", createdAt: serverTimestamp(),
          formattedDate: today.toLocaleDateString("ro-RO"), formattedDueDate: today.toLocaleDateString("ro-RO"),
        });
        transaction.update(settingsRef, { "invoicing.currentNumber": nextNumber });
        return { snapshot, invoiceId: newInvoiceRef.id };
      });
      success(`${t('billing_page.generate_invoice')} #${invoiceData.snapshot.series}-${invoiceData.snapshot.number} generated.`);
      if (authUser) {
        const adminQuery = query(collection(db, "team_members"), where("role", "in", ["Admin", "Coordinator"]));
        const adminSnaps = await getDocs(adminQuery);
        const notifications = adminSnaps.docs.filter(d => d.id !== authUser.uid).map(d => ({
          recipientId: d.id, recipientRole: d.data().role.toLowerCase() as any, type: "billing_generated" as any,
          category: "billing" as any, title: t('billing_page.generate_invoice'), message: `New invoice issued for ${invoice.clientName} (${invoice.total.toFixed(2)} RON)`,
          sourceType: "billing" as any, sourceId: invoiceData.invoiceId, triggeredBy: authUser.uid,
          actions: [{ label: t('billing_page.view_details'), type: "navigate" as const, route: "/billing" }]
        }));
        await createNotificationsBatch(notifications);
        const periodStr = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
        notifyParentInvoiceGenerated(invoice.clientId, { amount: invoice.total, period: periodStr, invoiceId: invoiceData.invoiceId, triggeredByUserId: authUser.uid }).catch(err => console.error("Failed to notify parents about invoice:", err));
      }
      const pdfBlob = await generateInvoicePDF({ ...invoiceData.snapshot, date: new Date(invoiceData.snapshot.date).toLocaleDateString("ro-RO"), dueDate: new Date(invoiceData.snapshot.dueDate).toLocaleDateString("ro-RO") });
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoice.clientName}_${invoiceData.snapshot.series}${invoiceData.snapshot.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error(err);
      error(t('common.error') + ": " + err.message);
    } finally {
      setGeneratingId(null);
      setPendingInvoice(null);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "synced": return { icon: CheckCircle, label: t('billing_page.status.synced'), classes: "bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400" };
      case "paid": return { icon: CheckCircle, label: t('billing_page.status.paid'), classes: "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400" };
      case "pending": return { icon: Clock, label: t('billing_page.status.pending'), classes: "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400" };
      default: return { icon: FileText, label: t('billing_page.status.create'), classes: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400" };
    }
  };

  const handleDeleteInvoice = (invoice: ClientInvoice) => {
    if (!invoice.invoiceId) return;
    customConfirm({
      title: t('billing_page.delete_invoice_storno'),
      message: t('billing_page.delete_confirm'),
      confirmLabel: t('common.delete'), variant: 'danger',
      onConfirm: async () => {
        if (onDeleteInvoice) { onDeleteInvoice(invoice.invoiceId!); } 
        else {
          try { await deleteDoc(doc(db, "invoices", invoice.invoiceId!)); success(t('common.success')); } 
          catch (err) { error(t('common.error')); }
        }
        closeMenu();
      }
    });
  };

  if (loading) return <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  if (invoices.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center">
        <FileText className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{t('billing_page.no_billable_sessions')}</h3>
        <p className="text-neutral-500">{t('billing_page.no_sessions_description')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder={t('billing_page.search_clients')}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredInvoices.map((invoice) => {
          const statusConfig = getStatusConfig(invoice.status);
          const StatusIcon = statusConfig.icon;
          const isPaid = invoice.status === "paid" || invoice.status === "synced";

          return (
            <div key={invoice.clientId} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/clients/profile?id=${invoice.clientId}`}
                    className="font-bold text-neutral-900 dark:text-white hover:text-primary-600 transition-colors truncate block flex items-center gap-2"
                  >
                    {invoice.clientName}
                    {invoice.hasActiveSubscription && <Zap className="w-3 h-3 text-primary-500 fill-primary-500" />}
                  </Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{invoice.billableSessions} {t('billing_page.table.sessions').toLowerCase()} • {invoice.totalHours}h</span>
                  </div>
                </div>
                <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0", statusConfig.classes)}>
                  <StatusIcon className="w-3.5 h-3.5 inline mr-1" />
                  {statusConfig.label}
                </span>
              </div>

              <div className="space-y-2 py-3 border-y border-neutral-50 dark:border-neutral-800/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500">{t('billing_page.table.sessions')}</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{invoice.billableSessions}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500">{t('billing_page.table.hours')}</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{invoice.totalHours}h</span>
                </div>
                {invoice.discount > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-500">{t('billing_page.table.discount')}</span>
                    <span className="text-success-600 font-medium">-{formatCurrency(invoice.discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">{t('billing_page.table.amount')}</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white leading-none mt-1">
                    {formatCurrency(invoice.total)} <span className="text-xs font-normal text-neutral-400">RON</span>
                  </p>
                </div>
                <button
                  onClick={(e) => handleMenuClick(e, invoice)}
                  disabled={generatingId === invoice.clientId || smartBillSyncingId === invoice.clientId}
                  className={clsx(
                    "p-2 rounded-xl transition-colors",
                    generatingId === invoice.clientId || smartBillSyncingId === invoice.clientId
                      ? "opacity-50 cursor-not-allowed"
                      : "text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20"
                  )}
                >
                  {generatingId === invoice.clientId || smartBillSyncingId === invoice.clientId ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <MoreVertical className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {menuPosition && activeInvoice && typeof document !== 'undefined' && createPortal(
        <>
          <div className="fixed inset-0 z-[100] bg-transparent" onClick={closeMenu} />
          <div className="fixed z-[101] w-48 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-xl py-1 animate-in fade-in zoom-in-95 duration-100" style={{ top: menuPosition.top, right: menuPosition.right }}>
            <button onClick={() => initiateInvoiceGeneration(activeInvoice)} disabled={activeInvoice.status !== 'create'} className={clsx("w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors", activeInvoice.status === 'create' ? "text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20" : "text-neutral-400 cursor-not-allowed")}><Download className="w-4 h-4" />{t('billing_page.generate_invoice')}</button>
            {!IS_DEMO && activeInvoice.invoiceId && (
              <button onClick={() => handleSyncToSmartBill(activeInvoice)} disabled={activeInvoice.status === 'synced'} className={clsx("w-full flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border-t border-neutral-50 dark:border-neutral-700", activeInvoice.status !== 'synced' ? "text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20" : "text-neutral-400 cursor-not-allowed")}><RefreshCw className="w-4 h-4" />{activeInvoice.status === 'synced' ? t('billing_page.status.already_synced') : t('billing_page.status.sync_smartbill')}</button>
            )}
            <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
            {['paid', 'synced'].includes(activeInvoice.status) ? (
              <button onClick={() => { onMarkAsPending?.(activeInvoice.clientId); closeMenu(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"><Clock className="w-4 h-4" />{t('billing_page.mark_pending')}</button>
            ) : (
              <button onClick={() => { if (activeInvoice.status !== 'create') { onMarkAsPaid?.(activeInvoice.clientId); closeMenu(); } }} disabled={activeInvoice.status === 'create'} title={activeInvoice.status === 'create' ? t('billing_page.generate_invoice_first') : t('billing_page.mark_as_paid')} className={clsx("w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors", activeInvoice.status === 'create' ? "text-neutral-400 cursor-not-allowed" : "text-success-600 hover:bg-success-50 dark:hover:bg-success-900/20")}><CheckCircle className="w-4 h-4" />{t('billing_page.mark_as_paid')}</button>
            )}
            <button onClick={closeMenu} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"><FileText className="w-4 h-4" />{t('billing_page.view_details')}</button>
            {activeInvoice.invoiceId && (
              <button onClick={() => handleDeleteInvoice(activeInvoice)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors border-t border-neutral-100 dark:border-neutral-700"><Trash2 className="w-4 h-4" />{t('billing_page.delete_invoice_storno')}</button>
            )}
          </div>
        </>,
        document.body
      )}

      {showEntitySelector && pendingInvoice && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('settings.billing_config.legal_entities.select_entity')}</h3>
                <p className="text-sm text-neutral-500">{t('settings.billing_config.legal_entities.select_entity_desc')}</p>
              </div>
              <button onClick={() => setShowEntitySelector(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-colors"><X className="w-5 h-5 text-neutral-400" /></button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              {(settings?.legalEntities || []).map((entity: any) => (
                <button key={entity.id} onClick={() => handleGenerateInvoice(pendingInvoice, entity)} className="w-full p-4 flex items-center gap-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-neutral-200 dark:border-neutral-700 hover:border-primary-200 dark:hover:border-primary-800 rounded-xl transition-all text-left group">
                  <div className="w-10 h-10 bg-white dark:bg-neutral-900 rounded-lg flex items-center justify-center text-neutral-400 group-hover:text-primary-50 shadow-sm border border-neutral-100 dark:border-neutral-800 transition-colors"><Building className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-neutral-900 dark:text-white truncate">{entity.name}</p>
                      {settings.defaultEntityId === entity.id && (<span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-[9px] font-bold uppercase rounded">{t('settings.billing_config.legal_entities.default_label')}</span>)}
                    </div>
                    <p className="text-xs text-neutral-500 truncate">{entity.cui} • {entity.iban}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 flex justify-end"><button onClick={() => setShowEntitySelector(false)} className="px-4 py-2 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors">{t('common.cancel')}</button></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
