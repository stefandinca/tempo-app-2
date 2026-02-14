"use client";

import { useState, useMemo } from "react";
import { Download, FileText, Users, DollarSign, ChevronDown, Check } from "lucide-react";
import { clsx } from "clsx";
import MonthSelector from "@/components/billing/MonthSelector";
import BillingOverview from "@/components/billing/BillingOverview";
import ClientInvoicesTable from "@/components/billing/ClientInvoicesTable";
import TeamPayoutsTable from "@/components/billing/TeamPayoutsTable";
import ExpenseManager from "@/components/billing/ExpenseManager";
import {
  useEventsByMonth,
  useClients,
  useServices,
  useTeamMembers,
  useInvoicesByMonth,
  usePayoutsByMonth,
  useExpensesByMonth
} from "@/hooks/useCollections";
import {
  aggregateClientInvoices,
  aggregateTeamPayouts,
  calculateBillingSummary
} from "@/lib/billing";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, getDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { createNotificationsBatch, getParentUids } from "@/lib/notificationService";
import { useTranslation } from "react-i18next";

type Tab = "invoices" | "payouts" | "expenses";

export default function BillingPage() {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { user: authUser } = useAuth();
  
  // Current month state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState<Tab>("invoices");
  const [isTabMenuOpen, setIsTabMenuOpen] = useState(false);

  // Fetch data
  const { data: events, loading: eventsLoading } = useEventsByMonth(year, month);
  const { data: existingInvoices, loading: invoicesLoading } = useInvoicesByMonth(year, month);
  const { data: existingPayouts, loading: payoutsLoading } = usePayoutsByMonth(year, month);
  const { data: expenses, loading: expensesLoading } = useExpensesByMonth(year, month);
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: services, loading: servicesLoading } = useServices();
  const { data: teamMembers, loading: teamLoading } = useTeamMembers();

  const loading = eventsLoading || clientsLoading || servicesLoading || teamLoading || invoicesLoading || payoutsLoading || expensesLoading;

  // Calculate invoices and payouts
  const invoices = useMemo(() => {
    if (loading) return [];
    return aggregateClientInvoices(events, clients, services, existingInvoices);
  }, [events, clients, services, existingInvoices, loading]);

  const payouts = useMemo(() => {
    if (loading) return [];
    return aggregateTeamPayouts(events, teamMembers.filter((m: any) => m.role !== 'Superadmin'), existingPayouts);
  }, [events, teamMembers, existingPayouts, loading]);

  const summary = useMemo(() => {
    return calculateBillingSummary(invoices, payouts, expenses);
  }, [invoices, payouts, expenses]);

  // Handlers
  const handleMonthChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
  };

  const handleMarkAsPaid = async (clientId: string) => {
    try {
      const q = query(
        collection(db, "invoices"),
        where("clientId", "==", clientId),
        where("status", "==", "issued"),
        where("year", "==", year),
        where("month", "==", month)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        error(t('billing_page.mark_paid_error'));
        return;
      }

      const updates = snapshot.docs.map(docSnap =>
        updateDoc(doc(db, "invoices", docSnap.id), {
          status: "paid",
          paidAt: new Date().toISOString()
        })
      );

      await Promise.all(updates);
      success(t('billing_page.mark_paid_success'));

      // Notify admins
      if (authUser) {
        const clientSnap = await getDoc(doc(db, "clients", clientId));
        const clientData = clientSnap.exists() ? clientSnap.data() : {};
        const clientName = clientData.name || t('common.unknown');
        const total = snapshot.docs.reduce((sum, d) => sum + (d.data().total || 0), 0);

        const adminQuery = query(collection(db, "team_members"), where("role", "in", ["Admin", "Coordinator"]));
        const adminSnaps = await getDocs(adminQuery);
        const notifications = adminSnaps.docs
          .filter(d => d.id !== authUser.uid)
          .map(d => ({
            recipientId: d.id,
            recipientRole: d.data().role.toLowerCase() as any,
            type: "system_alert" as any,
            category: "billing" as any,
            title: t('billing_page.notification_payment_received'),
            message: t('billing_page.notification_payment_message', { name: clientName, total: total.toFixed(2) }),
            sourceType: "billing" as any,
            sourceId: clientId,
            triggeredBy: authUser.uid
          }));
        await createNotificationsBatch(notifications);

        // Also notify parents that their payment was confirmed
        const parentUids = await getParentUids(clientId);
        if (parentUids.length > 0) {
          const parentNotifications = parentUids.map(uid => ({
            recipientId: uid,
            recipientRole: "parent" as any,
            type: "system_alert" as any,
            category: "billing" as any,
            title: t('billing_page.notification_payment_confirmed'),
            message: t('billing_page.notification_payment_confirmed_message', { total: total.toFixed(2) }),
            sourceType: "billing" as any,
            sourceId: clientId,
            triggeredBy: authUser.uid,
            actions: [{ label: t('billing_page.view_billing'), type: "navigate" as const, route: "/parent/billing/" }]
          }));
          await createNotificationsBatch(parentNotifications);
        }
      }

    } catch (err) {
      console.error(err);
      error(t('billing_page.update_error'));
    }
  };

  const handleMarkAsPending = async (clientId: string) => {
    try {
      const q = query(
        collection(db, "invoices"),
        where("clientId", "==", clientId),
        where("status", "==", "paid"),
        where("year", "==", year),
        where("month", "==", month)
      );

      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(docSnap => 
        updateDoc(doc(db, "invoices", docSnap.id), { 
          status: "issued",
          paidAt: null
        })
      );

      await Promise.all(updates);
      success(t('billing_page.mark_pending_success'));

    } catch (err) {
      console.error(err);
      error(t('billing_page.update_error'));
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      await deleteDoc(doc(db, "invoices", invoiceId));
      success(t('billing_page.delete_success'));
    } catch (err) {
      console.error(err);
      error(t('billing_page.delete_error'));
    }
  };

  const tabs = [
    { id: "invoices" as const, label: t('billing_page.client_invoices'), icon: FileText, count: invoices.length },
    { id: "payouts" as const, label: t('billing_page.team_payouts'), icon: Users, count: payouts.length },
    { id: "expenses" as const, label: t('billing_page.expenses'), icon: DollarSign, count: expenses.length }
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('billing_page.title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {t('billing_page.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <MonthSelector year={year} month={month} onChange={handleMonthChange} />
          <button className="flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            {t('billing_page.export')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <BillingOverview summary={summary} loading={loading} />

      {/* Tabs / Mobile Dropdown */}
      <div className="relative">
        {/* Mobile Dropdown */}
        <div className="md:hidden relative">
          <button
            onClick={() => setIsTabMenuOpen(!isTabMenuOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm font-bold text-neutral-900 dark:text-white shadow-sm"
          >
            <span className="flex items-center gap-2 text-primary-600">
              <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
              {tabs.find(t => t.id === activeTab)?.label}
            </span>
            <ChevronDown className={clsx("w-4 h-4 text-neutral-400 transition-transform", isTabMenuOpen && "rotate-180")} />
          </button>

          {isTabMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsTabMenuOpen(false)} />
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-1">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setIsTabMenuOpen(false);
                      }}
                      className={clsx(
                        "w-full flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-colors",
                        activeTab === tab.id
                          ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-bold"
                          : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded-full">{tab.count}</span>
                        {activeTab === tab.id && <Check className="w-4 h-4" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:block border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={clsx(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                    activeTab === tab.id
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span
                    className={clsx(
                      "px-2 py-0.5 rounded-full text-xs font-bold",
                      activeTab === tab.id
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    )}
                  >
                    {tab.count}
                  </span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "invoices" && (
          <ClientInvoicesTable
            invoices={invoices}
            loading={loading}
            onMarkAsPaid={handleMarkAsPaid}
            onMarkAsPending={handleMarkAsPending}
            onDeleteInvoice={handleDeleteInvoice}
          />
        )}
        {activeTab === "payouts" && (
          <TeamPayoutsTable 
            payouts={payouts} 
            loading={loading} 
            year={year}
            month={month}
          />
        )}
        {activeTab === "expenses" && (
          <ExpenseManager
            expenses={expenses}
            loading={loading}
            year={year}
            month={month}
          />
        )}
      </div>
    </div>
  );
}
