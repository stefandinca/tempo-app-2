"use client";

import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  CalendarCheck,
  ArrowRight,
  DollarSign,
  Minus,
  MessageSquare,
  CalendarPlus,
  Loader2
} from "lucide-react";
import Link from "next/link";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { KPICardSkeleton } from "@/components/ui/Skeleton";
import EventDetailPanel from "@/components/calendar/EventDetailPanel";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";

export default function Dashboard() {
  const { t } = useTranslation();
  const { events, clients, teamMembers } = useData();
  const { user, userRole } = useAuth();
  const { success, error: showError } = useToast();
  const eventsLoading = events.loading || clients.loading || teamMembers.loading;

  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleAttendance = async (eventId: string, attendance: 'present' | 'absent') => {
    try {
      const eventRef = doc(db, "events", eventId);
      await updateDoc(eventRef, {
        attendance,
        status: "completed"
      });
      success(t('calendar.event.save_success'));
    } catch (err) {
      showError(t('calendar.event.error_permission'));
    }
  };

  // Helper to resolve relationships
  const getClient = (id: string) => clients.data.find(c => c.id === id) || { name: "Unknown Client" };
  const getTherapist = (id: string) => teamMembers.data.find(t => t.id === id) || { name: "Unknown", initials: "?", color: "#ccc" };

  // Filter today's events
  const today = new Date();
  let todaysEvents = events.data.filter(evt => {
    const evtDate = new Date(evt.startTime);
    return evtDate.getDate() === today.getDate() &&
           evtDate.getMonth() === today.getMonth() &&
           evtDate.getFullYear() === today.getFullYear();
  });

  // Filter by therapist if user has Therapist role
  if (userRole === 'Therapist' && user) {
    todaysEvents = todaysEvents.filter(evt => evt.therapistId === user.uid);
  }

  todaysEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (eventsLoading) {
    return (
      <main className="flex-1 p-4 lg:p-6 space-y-6">
        {/* Skeleton KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
        {/* Skeleton Schedule */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="h-5 w-32 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                <div className="h-4 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 space-y-2">
                        <div className="h-4 w-12 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                        <div className="h-3 w-10 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                      </div>
                      <div className="w-3 h-3 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse mt-1.5" />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-4 w-28 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                          <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                          <div className="h-3 w-20 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Skeleton Activity */}
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <div className="h-5 w-28 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
              <div className="h-4 w-14 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 lg:p-6 space-y-6">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title={t('dashboard.active_clients')}
          value={clients.data.length.toString()}
          trend={t('dashboard.trends.this_month', { count: 3 })} 
          icon={Users} 
          trendIcon={TrendingUp}
          trendColor="text-success-600"
          iconBg="bg-primary-100 dark:bg-primary-900/30"
          iconColor="text-primary-600"
        />
        <KpiCard 
          title={t('dashboard.attendance_rate')} 
          value="94%" 
          trend={t('dashboard.trends.vs_last_week', { value: '-2%' })} 
          icon={CheckCircle} 
          trendIcon={TrendingDown}
          trendColor="text-error-600"
          iconBg="bg-warning-100 dark:bg-warning-900/30"
          iconColor="text-warning-600"
        />
        <KpiCard 
          title={t('dashboard.sessions_today')} 
          value={todaysEvents.length.toString()} 
          trend={t('dashboard.trends.same_as_yesterday')} 
          icon={CalendarCheck} 
          trendIcon={Minus}
          trendColor="text-neutral-500"
          iconBg="bg-secondary-100 dark:bg-secondary-900/30"
          iconColor="text-secondary-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Column: Today's Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">{t('dashboard.schedule.title')}</h3>
              <button className="text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">
                {t('dashboard.schedule.view_all')} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
               {todaysEvents.length === 0 ? (
                 <div className="p-8 text-center text-neutral-500">
                   {t('dashboard.schedule.no_sessions')}
                 </div>
               ) : (
                 todaysEvents.map(evt => {
                   const therapist = getTherapist(evt.therapistId);
                   const client = getClient(evt.clientId);
                   const locale = i18n.language || 'ro';
                   const startTime = new Date(evt.startTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
                   const endTime = new Date(evt.endTime).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

                   return (
                     <ScheduleItem
                        key={evt.id}
                        t={t}
                        time={startTime}
                        endTime={endTime}
                        client={client.name}
                        clientId={client.id}
                        type={evt.type}
                        therapist={therapist.name}
                        therapistId={therapist.id}
                        initials={therapist.initials}
                        color={therapist.color}
                        photoURL={therapist.photoURL}
                        status={evt.status}
                        showActions={evt.status === 'in-progress'}
                        onAttendance={(attendance: 'present' | 'absent') => handleAttendance(evt.id, attendance)}
                        onClick={() => {
                          setSelectedEvent(evt);
                          setIsDetailOpen(true);
                        }}
                     />
                   );
                 })
               )}
            </div>
          </div>
        </div>

        {/* Event Detail Panel */}
        <EventDetailPanel 
          event={selectedEvent}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />

        {/* Right Column: Activity (Still Mocked for now) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">{t('dashboard.activity.title')}</h3>
              <button className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">{t('dashboard.activity.view_all')}</button>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <ActivityItem
                user="Dr. Maria Garcia"
                action={t('dashboard.activity.actions.logged_attendance')}
                target="John Smith"
                time={t('dashboard.activity.time.minutes_ago', { count: 5 })}
                icon={CheckCircle}
                iconColor="text-primary-500"
                iconBg="bg-primary-50 dark:bg-primary-900/20"
              />
              <ActivityItem
                user="Dr. Andrei Ionescu"
                action={t('dashboard.activity.actions.created_event')}
                target="Team Meeting"
                time={t('dashboard.activity.time.minutes_ago', { count: 15 })}
                icon={CalendarPlus}
                iconColor="text-primary-500"
                iconBg="bg-primary-50 dark:bg-primary-900/20"
              />
              <ActivityItem
                user="Dr. Elena Popescu"
                action={t('dashboard.activity.actions.updated_progress')}
                target="Sara Lee"
                time={t('dashboard.activity.time.hours_ago', { count: 1 })}
                icon={TrendingUp}
                iconColor="text-primary-500"
                iconBg="bg-primary-50 dark:bg-primary-900/20"
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function KpiCard({ title, value, trend, icon: Icon, trendIcon: TrendIcon, trendColor, iconBg, iconColor }: any) {
  return (
    <div className="bg-white dark:bg-neutral-900 p-3 lg:p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex lg:flex-col justify-between lg:justify-start items-center lg:items-start gap-3 lg:gap-0">
        <div className="flex flex-col lg:mb-2 flex-1 lg:flex-none">
          <span className="text-xs lg:text-sm font-medium text-neutral-500 dark:text-neutral-400 font-display">{title}</span>
          <div className="flex items-baseline gap-2 lg:block">
            <h3 className="text-lg lg:text-2xl font-bold text-neutral-900 dark:text-white font-display tracking-tight leading-none lg:leading-normal">{value}</h3>
            <p className={`text-[10px] lg:text-sm flex items-center gap-1 mt-0 lg:mt-1 ${trendColor}`}>
              <TrendIcon className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
              {trend}
            </p>
          </div>
        </div>
        <div className={`p-1.5 lg:p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform order-first lg:order-none`}>
          <Icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 ${iconColor}`} />
        </div>
      </div>
    </div>
  );
}

function ScheduleItem({ t, time, endTime, client, clientId, type, therapist, therapistId, initials, color, photoURL, status, showActions, onAttendance, onClick }: any) {
  const statusColors: any = {
    'completed': 'bg-success-500',
    'in-progress': 'bg-warning-500',
    'upcoming': 'bg-neutral-300 dark:bg-neutral-600'
  };

  return (
    <div 
      onClick={onClick}
      className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group"
    >
      <div className="flex items-start gap-4">
        {/* Time */}
        <div className="text-sm text-neutral-500 dark:text-neutral-400 w-16 flex-shrink-0">
          <div className="font-medium text-neutral-900 dark:text-white">{time}</div>
          <div className="text-xs">{endTime}</div>
        </div>

        {/* Status Line */}
        <div className="mt-1.5 flex-shrink-0">
          <div className={`w-3 h-3 rounded-full ${statusColors[status] || statusColors['upcoming']}`}></div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link 
              href={clientId ? `/clients/profile?id=${clientId}` : "#"}
              onClick={(e) => e.stopPropagation()}
              className="font-medium text-neutral-900 dark:text-white truncate hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              {client}
            </Link>
            <span className="px-2 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full border border-neutral-200 dark:border-neutral-700">
              {type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <Link 
              href="/team/"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-2 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
            >
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-medium overflow-hidden" 
                style={{ backgroundColor: photoURL ? 'transparent' : (color || '#4A90E2') }}
              >
                {photoURL ? (
                  <img src={photoURL} alt={therapist} className="w-full h-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              <span>{therapist}</span>
            </Link>
          </div>

          {showActions && (
            <div className="mt-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <span className="text-xs text-neutral-500 mr-1">{t('dashboard.schedule.attendance')}:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAttendance?.('present');
                }}
                className="px-3 py-1 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-success-100 dark:hover:bg-success-900/30 hover:text-success-700 text-neutral-600 dark:text-neutral-400 transition-colors border border-neutral-200 dark:border-neutral-700"
              >
                {t('dashboard.schedule.present')}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAttendance?.('absent');
                }}
                className="px-3 py-1 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-error-100 dark:hover:bg-error-900/30 hover:text-error-700 text-neutral-600 dark:text-neutral-400 transition-colors border border-neutral-200 dark:border-neutral-700"
              >
                {t('dashboard.schedule.absent')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ user, action, target, time, icon: Icon, iconColor, iconBg, photoURL, userHref, targetHref }: any) {
  return (
    <div className="p-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      {photoURL ? (
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 shadow-sm border border-white dark:border-neutral-800">
          <img src={photoURL} alt={user} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className={`w-8 h-8 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-900 dark:text-white">
          <Link href={userHref || "/team/"} className="font-medium hover:text-primary-600 transition-colors">{user}</Link>
          <span className="text-neutral-500 dark:text-neutral-400"> {action} </span>
          <Link href={targetHref || "/clients/"} className="font-medium hover:text-primary-600 transition-colors">{target}</Link>
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}