"use client";

import {
  Calendar,
  ChevronRight,
  TrendingUp,
  Clock,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers, useClientInvoices } from "@/hooks/useCollections";
import ParentEventDetailPanel from "@/components/parent/ParentEventDetailPanel";
import ParentAlerts from "@/components/notifications/ParentAlerts";
import { useState, useMemo } from "react";
import { clsx } from "clsx";

export default function ParentDashboard() {
  const { data: client, sessions, loading: portalLoading, error: portalError } = usePortalData();
  const { data: team } = useTeamMembers();
  const { data: invoices, loading: invoicesLoading } = useClientInvoices(client?.id || "");
  
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const loading = portalLoading || invoicesLoading;
  const error = portalError;

  // Calculate Balance from Real Invoices
  const displayBalance = useMemo(() => {
    return invoices
      .filter(inv => inv.status === 'issued' || inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.total, 0);
  }, [invoices]);

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || "Could not load child data."} />;

  // Helper to parse dates
  const parseDate = (val: any) => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  // Logic: Find next upcoming session
  const now = new Date();
  const upcomingSessions = (sessions || [])
    .filter(s => parseDate(s.startTime) >= now)
    .sort((a, b) => parseDate(a.startTime).getTime() - parseDate(b.startTime).getTime());
    
  const nextSession = upcomingSessions[0];
  
  const getTherapist = (id: string) => {
    const found = (team || []).find(t => t.id === id);
    return found;
  };
  const nextTherapist = nextSession ? getTherapist(nextSession.therapistId) : null;

  // Stats
  const currentMonth = new Date().getMonth();
  const sessionsThisMonth = (sessions || []).filter(s => parseDate(s.startTime).getMonth() === currentMonth);
  const completedThisMonth = sessionsThisMonth.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 font-sans">
      
      {/* Welcome Section */}
      <section className="px-4 py-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">👋 Welcome back, {client.parentName?.split(' ')[0] || 'Parent'}!</h1>
        <p className="text-neutral-500 text-sm mt-1">Viewing portal for: <span className="font-bold text-primary-600">{client.name}</span></p>
      </section>

      {/* Upcoming Session Card */}
      <section className="px-4">
        {nextSession ? (
          <div 
            onClick={() => {
              setSelectedEvent(nextSession);
              setIsDetailOpen(true);
            }}
            className="bg-primary-600 rounded-3xl p-6 text-white shadow-lg shadow-primary-500/30 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Calendar className="w-24 h-24" />
            </div>
            <p className="text-primary-100 text-xs font-bold uppercase tracking-wider mb-1">Next Session</p>
            <h2 className="text-xl font-bold mb-4">
              {parseDate(nextSession.startTime).toLocaleDateString('en-US', { weekday: 'long' })}, {parseDate(nextSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </h2>
            
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                style={{ backgroundColor: nextTherapist?.color || 'rgba(255,255,255,0.2)' }}
              >
                {nextTherapist?.initials || '??'}
              </div>
              <div>
                <p className="text-sm font-bold">{nextSession.type}</p>
                <p className="text-xs text-primary-100">with {nextTherapist?.name || 'Assigned Therapist'}</p>
              </div>
              <div className="ml-auto p-2 bg-white text-primary-600 rounded-xl">
                <ChevronRight className="w-5 h-5" />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-neutral-100 dark:bg-neutral-800 rounded-3xl p-8 text-center border border-dashed border-neutral-300 dark:border-neutral-700">
            <Clock className="w-10 h-10 text-neutral-400 mx-auto mb-2" />
            <p className="text-neutral-500 font-medium">No upcoming sessions scheduled.</p>
          </div>
        )}
      </section>

      {/* Stats Grid */}
      <section className="px-4 grid grid-cols-2 gap-4">
        {/* Balance Card - Highly visible if due */}
        <Link 
          href="/parent/billing/"
          className={clsx(
            "col-span-2 p-5 rounded-3xl border transition-all shadow-sm flex items-center justify-between group",
            displayBalance > 0 
              ? "bg-warning-50 border-warning-100 dark:bg-warning-900/10 dark:border-warning-900/30" 
              : "bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
          )}
        >
          <div className="flex items-center gap-4">
            <div className={clsx(
              "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
              displayBalance > 0 ? "bg-warning-100 text-warning-600" : "bg-neutral-100 text-neutral-400"
            )}>
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <p className="text-neutral-500 text-xs font-medium uppercase tracking-widest">Balance Due</p>
              <h3 className="text-2xl font-black text-neutral-900 dark:text-white">
                {displayBalance.toFixed(2)} RON
              </h3>
            </div>
          </div>
          <div className="p-2 bg-white dark:bg-neutral-800 rounded-xl shadow-sm group-hover:translate-x-1 transition-transform">
            <ChevronRight className="w-5 h-5 text-neutral-400" />
          </div>
        </Link>

        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="w-10 h-10 bg-success-50 dark:bg-success-900/20 rounded-xl flex items-center justify-center text-success-600 mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-neutral-500 text-xs font-medium">Overall Progress</p>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{client.progress || 0}%</h3>
          <p className="text-[10px] text-success-600 font-bold mt-1">+4% this month</p>
        </div>
        <div className="bg-white dark:bg-neutral-900 p-5 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="w-10 h-10 bg-secondary-50 dark:bg-secondary-900/20 rounded-xl flex items-center justify-center text-secondary-600 mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-neutral-500 text-xs font-medium">Sessions (Feb)</p>
          <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mt-1">{sessionsThisMonth.length}</h3>
          <p className="text-[10px] text-neutral-400 font-bold mt-1">{completedThisMonth.length} completed</p>
        </div>
      </section>

      {/* Recent Alerts */}
      <ParentAlerts clientName={client.name} />

      <ParentEventDetailPanel 
        event={selectedEvent}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />

    </div>
  );
}