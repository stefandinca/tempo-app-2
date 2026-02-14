"use client";

import { useState, Fragment, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
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
  
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
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

  const toggleRow = (clientId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedRows(newExpanded);
  };

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

      <div className="md:hidden space-y-4">
        {filteredInvoices.map((invoice) => {
          const isExpanded = expandedRows.has(invoice.clientId);
          const statusConfig = getStatusConfig(invoice.status);
          const StatusIcon = statusConfig.icon;
          return (
            <div key={invoice.clientId} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 flex flex-col gap-3 cursor-pointer" onClick={() => toggleRow(invoice.clientId)}>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <Link href={`/clients/profile?id=${invoice.clientId}`} onClick={(e) => e.stopPropagation()} className="font-bold text-neutral-900 dark:text-white hover:text-primary-600 transition-colors flex items-center gap-2">
                      {invoice.clientName}
                      {invoice.hasActiveSubscription && <Zap className="w-3 h-3 text-primary-500 fill-primary-500" />}
                    </Link>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase", statusConfig.classes)}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {statusConfig.label}
                      </span>
                    </div>
                  </div>
                  <button onClick={(e) => handleMenuClick(e, invoice)} className="p-2 -mr-2 text-neutral-400 hover:text-neutral-600">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex items-center justify-between py-2 border-y border-neutral-50 dark:border-neutral-800/50">
                  <div className="text-center">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">{t('billing_page.table.sessions')}</p>
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{invoice.billableSessions}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">{t('billing_page.table.hours')}</p>
                    <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{invoice.totalHours}h</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold">{t('billing_page.table.amount')}</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">{formatCurrency(invoice.total)} RON</p>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-neutral-500 font-medium">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  {isExpanded ? t('common.close') : t('billing_page.view_details')}
                </div>
              </div>
              {isExpanded && (
                <div className="bg-neutral-50 dark:bg-neutral-800/20 p-4 border-t border-neutral-100 dark:border-neutral-800">
                  <div className="space-y-2">
                    {invoice.lineItems.map((item, idx) => (
                      <div key={idx} className="flex flex-col gap-1 p-2 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-100 dark:border-neutral-800 shadow-sm text-xs">
                        <div className="flex justify-between">
                          <span className="font-bold text-neutral-900 dark:text-white">{item.serviceLabel}</span>
                          <span className="font-bold">{formatCurrency(item.amount)} RON</span>
                        </div>
                        <div className="flex justify-between text-neutral-500">
                          <span>{formatDate(item.date)} • {formatTime(item.date)}</span>
                          <span>{item.duration} min</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-3 w-8"></th>
                <th className="px-6 py-3">{t('billing_page.table.client')}</th>
                <th className="px-6 py-3 text-center">{t('billing_page.table.sessions')}</th>
                <th className="px-6 py-3 text-center">{t('billing_page.table.hours')}</th>
                <th className="px-6 py-3 text-right">{t('billing_page.table.amount')}</th>
                <th className="px-6 py-3 text-center">{t('billing_page.table.status')}</th>
                <th className="px-6 py-3 text-right">{t('billing_page.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredInvoices.map((invoice) => {
                const isExpanded = expandedRows.has(invoice.clientId);
                const statusConfig = getStatusConfig(invoice.status);
                const StatusIcon = statusConfig.icon;
                return (
                  <Fragment key={invoice.clientId}>
                    <tr className={clsx("hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer", isExpanded && "bg-neutral-50 dark:bg-neutral-800/30")} onClick={() => toggleRow(invoice.clientId)}>
                      <td className="px-6 py-4"><button className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors">{isExpanded ? <ChevronDown className="w-4 h-4 text-neutral-500" /> : <ChevronRight className="w-4 h-4 text-neutral-500" />}</button></td>
                      <td className="px-6 py-4"><Link href={`/clients/profile?id=${invoice.clientId}`} onClick={(e) => e.stopPropagation()} className="font-medium text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex items-center gap-2">{invoice.clientName}{invoice.hasActiveSubscription && (<span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 text-[9px] font-bold uppercase rounded flex items-center gap-0.5"><Zap className="w-2.5 h-2.5" />{t('billing_page.subscription_label')}</span>)}</Link></td>
                      <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">{invoice.billableSessions}{invoice.excusedSessions > 0 && (<span className="text-xs text-neutral-400 ml-1">{t('billing_page.table.excused_info', { count: invoice.excusedSessions })}</span>)}</td>
                      <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">{invoice.totalHours}h</td>
                      <td className="px-6 py-4 text-right"><span className="font-bold text-neutral-900 dark:text-white">{formatCurrency(invoice.total)} RON</span>{invoice.discount > 0 && (<span className="block text-xs text-success-600">{t('billing_page.table.discount_info', { amount: formatCurrency(invoice.discount) })}</span>)}</td>
                      <td className="px-6 py-4 text-center"><span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold", statusConfig.classes)}><StatusIcon className="w-3.5 h-3.5" />{statusConfig.label}</span></td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}><button onClick={(e) => handleMenuClick(e, invoice)} disabled={generatingId === invoice.clientId || smartBillSyncingId === invoice.clientId} className={clsx("p-2 rounded-lg transition-colors disabled:opacity-50", activeInvoice?.clientId === invoice.clientId ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white" : "text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800")}>{generatingId === invoice.clientId || smartBillSyncingId === invoice.clientId ? <Loader2 className="w-4 h-4 animate-spin" /> : <MoreVertical className="w-4 h-4" />}</button></td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${invoice.clientId}-details`}><td colSpan={7} className="px-6 py-4 bg-neutral-50 dark:bg-neutral-800/20"><div className="pl-8 space-y-2"><p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{t('billing_page.table.session_breakdown')}</p><div className="grid gap-2">{invoice.lineItems.map((item, idx) => (<div key={idx} className={clsx("flex items-center justify-between py-2 px-3 rounded-lg border", item.isBillable ? "bg-white dark:bg-neutral-900 border-neutral-100 dark:border-neutral-800" : "bg-neutral-100 dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700 opacity-60")}><div className="flex items-center gap-4"><span className="text-sm text-neutral-500 w-20">{formatDate(item.date)}</span><span className="text-sm text-neutral-500 w-16">{formatTime(item.date)}</span><span className="text-sm font-medium text-neutral-900 dark:text-white">{item.serviceLabel}</span><span className="text-xs text-neutral-400">({item.duration} min)</span>{item.attendance && (<span className={clsx("text-xs px-1.5 py-0.5 rounded font-medium", item.attendance === "present" && "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400", item.attendance === "absent" && "bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-400", item.attendance === "excused" && "bg-neutral-200 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400")}>{item.attendance === "present" && t('attendance.present')}{item.attendance === "absent" && t('attendance.absent')}{item.attendance === "excused" && t('attendance.excused')}</span>)}</div><span className={clsx("text-sm font-medium", item.isBillable ? "text-neutral-700 dark:text-neutral-300" : "text-neutral-400 line-through")}>{item.isBillable ? `${formatCurrency(item.amount)} RON` : t('billing_page.table.not_billed')}</span></div>))}</div>{invoice.discount > 0 && (<div className="flex items-center justify-between py-2 px-3 mt-2 border-t border-neutral-200 dark:border-neutral-700"><span className="text-sm text-neutral-500">{t('common.subtotal') || 'Subtotal'}</span><span className="text-sm text-neutral-700 dark:text-neutral-300">{formatCurrency(invoice.subtotal)} RON</span></div>)}{invoice.discount > 0 && (<div className="flex items-center justify-between py-2 px-3"><span className="text-sm text-success-600">{t('billing_page.table.discount')}</span><span className="text-sm text-success-600">-{formatCurrency(invoice.discount)} RON</span></div>)}</div></td></tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
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
