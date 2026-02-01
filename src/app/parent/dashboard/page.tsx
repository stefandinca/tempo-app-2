"use client";

import { 
  Calendar, 
  ChevronRight, 
  ArrowUpRight,
  TrendingUp,
  FileText,
  Clock
} from "lucide-react";
import Link from "next/link";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers } from "@/hooks/useCollections";

export default function ParentDashboard() {
  const { data: client, sessions, loading, error } = usePortalData();
  const { data: team } = useTeamMembers();

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || "Could not load child data."} />;

  // Logic: Find next upcoming session
  const now = new Date();
  const upcomingSessions = sessions.filter(s => new Date(s.startTime) >= now);
  const nextSession = upcomingSessions[0];
  
  const getTherapist = (id: string) => team.find(t => t.id === id);
  const nextTherapist = nextSession ? getTherapist(nextSession.therapistId) : null;

  // Stats
  const currentMonth = new Date().getMonth();
  const sessionsThisMonth = sessions.filter(s => new Date(s.startTime).getMonth() === currentMonth);
  const completedThisMonth = sessionsThisMonth.filter(s => s.status === 'completed');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Welcome Section */}
      <section className="px-4 py-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">👋 Welcome back, {client.parentName?.split(' ')[0] || 'Parent'}!</h1>
        <p className="text-neutral-500 text-sm mt-1">Viewing portal for: <span className="font-bold text-primary-600">{client.name}</span></p>
      </section>

      {/* Upcoming Session Card */}
      <section className="px-4">
        {nextSession ? (
          <div className="bg-primary-600 rounded-3xl p-6 text-white shadow-lg shadow-primary-500/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-20">
              <Calendar className="w-24 h-24" />
            </div>
            <p className="text-primary-100 text-xs font-bold uppercase tracking-wider mb-1">Next Session</p>
            <h2 className="text-xl font-bold mb-4">
              {new Date(nextSession.startTime).toLocaleDateString('en-US', { weekday: 'long' })}, {new Date(nextSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
              <Link 
                href={`/parent/schedule`}
                className="ml-auto p-2 bg-white text-primary-600 rounded-xl"
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
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

      {/* Recent Activity / Updates */}
      <section className="px-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-neutral-900 dark:text-white">Recent Updates</h3>
          <button className="text-sm font-bold text-primary-600">View All</button>
        </div>
        
        <div className="space-y-3 pb-8">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center text-neutral-400">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-neutral-900 dark:text-white">Monthly Report - Jan</p>
                <p className="text-xs text-neutral-500">Shared on Feb 1, 2026</p>
              </div>
              <button className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg">
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}