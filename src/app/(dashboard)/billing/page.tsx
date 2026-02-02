"use client";

import { useState, useMemo } from "react";
import { Download, FileText, Users } from "lucide-react";
import { clsx } from "clsx";
import MonthSelector from "@/components/billing/MonthSelector";
import BillingOverview from "@/components/billing/BillingOverview";
import ClientInvoicesTable from "@/components/billing/ClientInvoicesTable";
import TeamPayoutsTable from "@/components/billing/TeamPayoutsTable";
import {
  useEventsByMonth,
  useClients,
  useServices,
  useTeamMembers,
  useInvoicesByMonth,
  usePayoutsByMonth
} from "@/hooks/useCollections";
import {
  aggregateClientInvoices,
  aggregateTeamPayouts,
  calculateBillingSummary
} from "@/lib/billing";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";

type Tab = "invoices" | "payouts";

export default function BillingPage() {
  const { success, error } = useToast();
  
  // Current month state
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [activeTab, setActiveTab] = useState<Tab>("invoices");

  // Fetch data
  const { data: events, loading: eventsLoading } = useEventsByMonth(year, month);
  const { data: existingInvoices, loading: invoicesLoading } = useInvoicesByMonth(year, month);
  const { data: existingPayouts, loading: payoutsLoading } = usePayoutsByMonth(year, month);
  const { data: clients, loading: clientsLoading } = useClients();
  const { data: services, loading: servicesLoading } = useServices();
  const { data: teamMembers, loading: teamLoading } = useTeamMembers();

  const loading = eventsLoading || clientsLoading || servicesLoading || teamLoading || invoicesLoading || payoutsLoading;

  // Calculate invoices and payouts
  const invoices = useMemo(() => {
    if (loading) return [];
    return aggregateClientInvoices(events, clients, services, existingInvoices);
  }, [events, clients, services, existingInvoices, loading]);

  const payouts = useMemo(() => {
    if (loading) return [];
    return aggregateTeamPayouts(events, teamMembers, existingPayouts);
  }, [events, teamMembers, existingPayouts, loading]);

  const summary = useMemo(() => {
    return calculateBillingSummary(invoices, payouts);
  }, [invoices, payouts]);

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
        where("status", "==", "issued")
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        error("Cannot mark as paid: Invoice not generated yet.");
        return;
      }

      const updates = snapshot.docs.map(docSnap => 
        updateDoc(doc(db, "invoices", docSnap.id), { 
          status: "paid",
          paidAt: new Date().toISOString()
        })
      );

      await Promise.all(updates);
      success("Invoice marked as paid.");

    } catch (err) {
      console.error(err);
      error("Failed to update invoice status.");
    }
  };

  const handleMarkAsPending = async (clientId: string) => {
    try {
      const q = query(
        collection(db, "invoices"), 
        where("clientId", "==", clientId),
        where("status", "==", "paid")
      );
      
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(docSnap => 
        updateDoc(doc(db, "invoices", docSnap.id), { 
          status: "issued",
          paidAt: null
        })
      );

      await Promise.all(updates);
      success("Invoice marked as pending.");

    } catch (err) {
      console.error(err);
      error("Failed to update status.");
    }
  };

  const tabs = [
    { id: "invoices" as Tab, label: "Client Invoices", icon: FileText, count: invoices.length },
    { id: "payouts" as Tab, label: "Team Payouts", icon: Users, count: payouts.length }
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Billing</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage client invoices and team payouts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <MonthSelector year={year} month={month} onChange={handleMonthChange} />
          <button className="flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <BillingOverview summary={summary} loading={loading} />

      {/* Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
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

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "invoices" && (
          <ClientInvoicesTable
            invoices={invoices}
            loading={loading}
            onMarkAsPaid={handleMarkAsPaid}
            onMarkAsPending={handleMarkAsPending}
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
      </div>
    </div>
  );
}
