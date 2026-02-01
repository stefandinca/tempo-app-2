"use client";

import { 
  X, 
  Calendar, 
  Clock, 
  User, 
  BookOpen, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from "lucide-react";
import { clsx } from "clsx";
import { useTeamMembers, usePrograms } from "@/hooks/useCollections";

interface ParentEventDetailPanelProps {
  event: any;
  isOpen: boolean;
  onClose: () => void;
}

export default function ParentEventDetailPanel({ event, isOpen, onClose }: ParentEventDetailPanelProps) {
  const { data: team } = useTeamMembers();
  const { data: programs } = usePrograms();

  if (!event) return null;

  const therapist = (team || []).find(t => t.id === event.therapistId);
  const selectedPrograms = (programs || []).filter(p => event.programIds?.includes(p.id));

  const parseDate = (val: any) => {
    if (!val) return new Date(0);
    if (val.seconds) return new Date(val.seconds * 1000);
    return new Date(val);
  };

  const sessDate = parseDate(event.startTime);

  return (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 backdrop-blur-sm",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-neutral-900 shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out border-l border-neutral-200 dark:border-neutral-800",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Session Details</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] p-6 space-y-6 pb-20">
          
          {/* Header Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-neutral-900 dark:text-white">{event.type}</h4>
              <p className="text-sm text-neutral-500">Session ID: {event.id.slice(-6).toUpperCase()}</p>
            </div>
          </div>

          {/* Time & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Date</p>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Calendar className="w-3.5 h-3.5" />
                {sessDate.toLocaleDateString()}
              </div>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Time</p>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Clock className="w-3.5 h-3.5" />
                {sessDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Attendance Status */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Attendance Status</p>
            <div className={clsx(
              "flex items-center gap-2 px-4 py-3 rounded-xl border font-bold text-sm",
              event.attendance === 'present' ? "bg-success-50 border-success-100 text-success-700" :
              event.attendance === 'absent' ? "bg-error-50 border-error-100 text-error-700" :
              event.attendance === 'excused' ? "bg-warning-50 border-warning-100 text-warning-700" :
              "bg-neutral-50 border-neutral-100 text-neutral-500"
            )}>
              {event.attendance === 'present' ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              {event.attendance ? event.attendance.charAt(0).toUpperCase() + event.attendance.slice(1) : 'Scheduled'}
            </div>
          </div>

          {/* Therapist */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Therapist</p>
            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm"
                style={{ backgroundColor: therapist?.color || '#ccc' }}
              >
                {therapist?.initials || '??'}
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">{therapist?.name || "Assigned Therapist"}</p>
                <p className="text-[10px] text-neutral-500 uppercase font-bold">{therapist?.role || "Clinic Staff"}</p>
              </div>
            </div>
          </div>

          {/* Programs & Scores */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Programs & Progress</p>
            <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
              {selectedPrograms.length > 0 ? (
                <div className="space-y-4">
                  {selectedPrograms.map(p => (
                    <div key={p.id} className="space-y-2">
                      <div className="flex items-start gap-3">
                        <BookOpen className="w-4 h-4 text-primary-500 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">{p.title}</p>
                          <p className="text-xs text-neutral-500 line-clamp-1">{p.description}</p>
                        </div>
                      </div>
                      
                      {/* Placeholder for scores display logic if available in event document */}
                      {event.programScores?.[p.id] && (
                        <div className="ml-7 flex gap-2">
                           {Object.entries(event.programScores[p.id]).map(([scoreType, count]: [string, any]) => (
                             <span key={scoreType} className="text-[10px] font-bold px-2 py-0.5 bg-white dark:bg-neutral-700 rounded border border-neutral-200 dark:border-neutral-600">
                               {scoreType}: {count}
                             </span>
                           ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 italic">No specific programs tracked.</p>
                </div>
              )}
            </div>
          </div>

          {/* Session Notes */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Session Notes</p>
            <div className="bg-primary-50/50 dark:bg-primary-900/10 p-4 rounded-xl border border-primary-100/50 dark:border-primary-900/30">
              {event.isPublic !== false && event.details ? (
                <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed italic">
                  &ldquo;{event.details}&rdquo;
                </p>
              ) : (
                <div className="text-center py-2 flex flex-col items-center">
                  <FileText className="w-6 h-6 text-neutral-300 mb-2" />
                  <p className="text-xs text-neutral-400 italic">Clinical observations are still being processed.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
          <button 
            onClick={onClose}
            className="w-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold py-3 transition-colors shadow-lg"
          >
            Close Details
          </button>
        </div>

      </div>
    </>
  );
}

function Circle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
