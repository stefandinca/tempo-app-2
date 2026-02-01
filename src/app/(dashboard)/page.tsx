"use client";

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
import { useEvents, useClients, useTeamMembers } from "@/hooks/useCollections";

export default function Dashboard() {
  const { data: events, loading: eventsLoading } = useEvents();
  const { data: clients } = useClients();
  const { data: team } = useTeamMembers();

  // Helper to resolve relationships
  const getClient = (id: string) => clients.find(c => c.id === id) || { name: "Unknown Client" };
  const getTherapist = (id: string) => team.find(t => t.id === id) || { name: "Unknown", initials: "?", color: "#ccc" };

  // Filter today's events
  const today = new Date();
  const todaysEvents = events.filter(evt => {
    const evtDate = new Date(evt.startTime);
    return evtDate.getDate() === today.getDate() && 
           evtDate.getMonth() === today.getMonth() && 
           evtDate.getFullYear() === today.getFullYear();
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  if (eventsLoading) {
    return (
      <div className="flex h-full items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <main className="flex-1 p-4 lg:p-6 space-y-6">
      
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard 
          title="Today's Revenue" 
          value="$2,450" 
          trend="+12% vs yesterday" 
          icon={DollarSign} 
          trendIcon={TrendingUp}
          trendColor="text-success-600"
          iconBg="bg-success-100 dark:bg-success-900/30"
          iconColor="text-success-600"
        />
        <KpiCard 
          title="Active Clients" 
          value={clients.length.toString()} 
          trend="+3 this month" 
          icon={Users} 
          trendIcon={TrendingUp}
          trendColor="text-success-600"
          iconBg="bg-primary-100 dark:bg-primary-900/30"
          iconColor="text-primary-600"
        />
        <KpiCard 
          title="Attendance Rate" 
          value="94%" 
          trend="-2% vs last week" 
          icon={CheckCircle} 
          trendIcon={TrendingDown}
          trendColor="text-error-600"
          iconBg="bg-warning-100 dark:bg-warning-900/30"
          iconColor="text-warning-600"
        />
        <KpiCard 
          title="Sessions Today" 
          value={todaysEvents.length.toString()} 
          trend="Same as yesterday" 
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
              <h3 className="font-semibold text-neutral-900 dark:text-white">Today's Schedule</h3>
              <button className="text-sm text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 hover:underline">
                View All <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
               {todaysEvents.length === 0 ? (
                 <div className="p-8 text-center text-neutral-500">
                   No sessions scheduled for today.
                 </div>
               ) : (
                 todaysEvents.map(evt => {
                   const therapist = getTherapist(evt.therapistId);
                   const client = getClient(evt.clientId);
                   const startTime = new Date(evt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                   const endTime = new Date(evt.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                   return (
                     <ScheduleItem 
                        key={evt.id}
                        time={startTime} 
                        endTime={endTime}
                        client={client.name}
                        type={evt.type}
                        therapist={therapist.name}
                        initials={therapist.initials}
                        color={therapist.color}
                        status={evt.status}
                        showActions={evt.status === 'in-progress'}
                     />
                   );
                 })
               )}
            </div>
          </div>
        </div>

        {/* Right Column: Activity (Still Mocked for now) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="font-semibold text-neutral-900 dark:text-white">Recent Activity</h3>
              <button className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline">View All</button>
            </div>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              <ActivityItem 
                user="Dr. Maria Garcia" 
                action="logged attendance" 
                target="John Smith" 
                time="5 min ago"
                icon={CheckCircle}
                iconColor="text-primary-500"
                iconBg="bg-primary-50 dark:bg-primary-900/20"
              />
              <ActivityItem 
                user="Dr. Andrei Ionescu" 
                action="created event" 
                target="Team Meeting" 
                time="15 min ago"
                icon={CalendarPlus}
                iconColor="text-primary-500"
                iconBg="bg-primary-50 dark:bg-primary-900/20"
              />
              <ActivityItem 
                user="Dr. Elena Popescu" 
                action="updated progress" 
                target="Sara Lee" 
                time="1 hour ago"
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
    <div className="bg-white dark:bg-neutral-900 p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</span>
        <div className={`p-2 rounded-lg ${iconBg} group-hover:scale-110 transition-transform`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</h3>
        <p className={`text-sm flex items-center gap-1 mt-1 ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          {trend}
        </p>
      </div>
    </div>
  );
}

function ScheduleItem({ time, endTime, client, type, therapist, initials, color, status, showActions }: any) {
  const statusColors: any = {
    'completed': 'bg-success-500',
    'in-progress': 'bg-warning-500',
    'upcoming': 'bg-neutral-300 dark:bg-neutral-600'
  };

  return (
    <div className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer group">
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
            <h4 className="font-medium text-neutral-900 dark:text-white truncate">{client}</h4>
            <span className="px-2 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 rounded-full border border-neutral-200 dark:border-neutral-700">
              {type}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
            <div 
              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white font-medium" 
              style={{ backgroundColor: color ? color : '#4A90E2' }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                {initials}
              </div>
            </div>
            <span>{therapist}</span>
          </div>

          {showActions && (
            <div className="mt-3 flex items-center gap-2 animate-in slide-in-from-top-2 duration-200">
              <span className="text-xs text-neutral-500 mr-1">Attendance:</span>
              <button className="px-3 py-1 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-success-100 dark:hover:bg-success-900/30 hover:text-success-700 text-neutral-600 dark:text-neutral-400 transition-colors border border-neutral-200 dark:border-neutral-700">
                Present
              </button>
              <button className="px-3 py-1 text-xs rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-error-100 dark:hover:bg-error-900/30 hover:text-error-700 text-neutral-600 dark:text-neutral-400 transition-colors border border-neutral-200 dark:border-neutral-700">
                Absent
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ user, action, target, time, icon: Icon, iconColor, iconBg }: any) {
  return (
    <div className="p-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
      <div className={`w-8 h-8 ${iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-neutral-900 dark:text-white">
          <span className="font-medium">{user}</span>
          <span className="text-neutral-500 dark:text-neutral-400"> {action} </span>
          <span className="font-medium">{target}</span>
        </p>
        <p className="text-xs text-neutral-400 mt-0.5">{time}</p>
      </div>
    </div>
  );
}