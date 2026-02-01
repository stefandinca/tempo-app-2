"use client";

import { 
  Calendar, 
  CheckCircle2, 
} from "lucide-react";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers } from "@/hooks/useCollections";
import { clsx } from "clsx";
import { useState } from "react";
import ParentEventDetailPanel from "@/components/parent/ParentEventDetailPanel";

export default function ParentSchedulePage() {
  const { data: client, sessions, loading, error } = usePortalData();
  const { data: team } = useTeamMembers();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || "Could not load schedule."} />;

  const getTherapist = (id: string) => {
    const found = (team || []).find(t => t.id === id);
    if (!found && id) console.log(`Schedule: Therapist with ID ${id} not found in team list of ${team?.length || 0} members`);
    return found;
  };

  // Helper to parse dates
  const parseDate = (val: any) => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  // Group sessions by date
  const groupedSessions = sessions.reduce((acc: any, sess) => {
    const dateKey = parseDate(sess.startTime).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(sess);
    return acc;
  }, {});

  return (
    <div className="p-4 space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-12">
      <header>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Session Schedule</h1>
        <p className="text-neutral-500 text-sm">Upcoming and past therapy sessions</p>
      </header>

      {sessions.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <div className="w-16 h-16 bg-neutral-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-neutral-300" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No sessions found</h3>
          <p className="text-neutral-500 text-sm mt-1">Schedule details will appear here soon.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSessions).map(([date, dateSessions]: [string, any]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-2">{date}</h3>
              <div className="space-y-3">
                {dateSessions.map((sess: any) => {
                  const therapist = getTherapist(sess.therapistId);
                  const sessDate = parseDate(sess.startTime);
                  const isUpcoming = sessDate > new Date();
                  
                  return (
                    <div 
                      key={sess.id}
                      onClick={() => {
                        setSelectedEvent(sess);
                        setIsDetailOpen(true);
                      }}
                      className={clsx(
                        "bg-white dark:bg-neutral-900 p-4 rounded-2xl border transition-all shadow-sm cursor-pointer active:scale-[0.99]",
                        isUpcoming ? "border-primary-100 dark:border-primary-900/30 hover:border-primary-300" : "border-neutral-200 dark:border-neutral-800 opacity-80"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-bold text-neutral-900 dark:text-white">
                              {sessDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="w-1 h-1 rounded-full bg-neutral-300" />
                            <span className="text-sm font-medium text-neutral-500">
                              {sess.duration} min
                            </span>
                          </div>
                          <h4 className="font-bold text-neutral-900 dark:text-white truncate">{sess.type}</h4>
                          
                          <div className="flex items-center gap-2 mt-3">
                            <div 
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                              style={{ backgroundColor: therapist?.color || '#ccc' }}
                            >
                              {therapist?.initials || '??'}
                            </div>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">
                              {therapist?.name || 'Assigned Therapist'}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          {sess.status === 'completed' ? (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-success-600 bg-success-50 dark:bg-success-900/20 px-2 py-1 rounded-full uppercase tracking-wider">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed
                            </span>
                          ) : isUpcoming ? (
                            <button className="text-[10px] font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-1.5 rounded-full uppercase tracking-wider hover:bg-primary-100 transition-colors">
                              Confirm
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-neutral-400 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-full uppercase tracking-wider">
                              Past
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
                </div>
              )}
        
              <ParentEventDetailPanel 
                event={selectedEvent}
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
              />
            </div>
          );
        }
        