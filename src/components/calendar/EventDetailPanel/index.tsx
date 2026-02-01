"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Calendar,
  Clock,
  User,
  BookOpen,
  Check,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useClients, useTeamMembers, usePrograms } from "@/hooks/useCollections";
import ProgramScoreCounter, { ProgramScores } from "./ProgramScoreCounter";

interface EventDetailPanelProps {
  event: any; // Firestore Event Document
  isOpen: boolean;
  onClose: () => void;
}

export default function EventDetailPanel({ event, isOpen, onClose }: EventDetailPanelProps) {
  const { success, error } = useToast();
  const { data: clients } = useClients();
  const { data: teamMembers } = useTeamMembers();
  const { data: programs } = usePrograms();

  // Local state for editing
  const [attendance, setAttendance] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [programScores, setProgramScores] = useState<Record<string, ProgramScores>>({});
  const [isScoresExpanded, setIsScoresExpanded] = useState(true);

  // Default scores for a new program
  const defaultScores: ProgramScores = { minus: 0, zero: 0, prompted: 0, plus: 0 };

  // Sync state when event changes
  useEffect(() => {
    if (event) {
      setAttendance(event.attendance || null);
      setNotes(event.details || "");

      // Initialize program scores from event or create defaults
      const existingScores = event.programScores || {};
      const initialScores: Record<string, ProgramScores> = {};

      (event.programIds || []).forEach((programId: string) => {
        initialScores[programId] = existingScores[programId] || { ...defaultScores };
      });

      setProgramScores(initialScores);
    }
  }, [event]);

  // Handle score changes
  const handleScoreChange = useCallback((programId: string, scores: ProgramScores) => {
    setProgramScores(prev => ({
      ...prev,
      [programId]: scores
    }));
  }, []);

  if (!event) return null;

  const client = (clients || []).find(c => c.id === event.clientId);
  const therapist = (teamMembers || []).find(t => t.id === event.therapistId);
  const selectedPrograms = (programs || []).filter(p => event.programIds?.includes(p.id));

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      const eventRef = doc(db, "events", event.id);
      await updateDoc(eventRef, {
        attendance,
        details: notes,
        programScores,
        status: attendance ? "completed" : "upcoming"
      });
      success("Event updated successfully");
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error(err);
      error("Failed to update event");
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "events", event.id));
      success("Event deleted");
      setIsDeleting(false);
      onClose();
    } catch (err) {
      console.error(err);
      error("Failed to delete event");
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-neutral-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-neutral-200 dark:border-neutral-800",
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
        <div className="flex-1 overflow-y-auto h-[calc(100vh-8rem)] p-6 space-y-6">
          
          {/* Header Info */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-lg text-neutral-900 dark:text-white">{event.title}</h4>
              <p className="text-sm text-neutral-500">{event.type}</p>
            </div>
          </div>

          {/* Time & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Date</p>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(event.startTime).toLocaleDateString()}
              </div>
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">Time</p>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                <Clock className="w-3.5 h-3.5" />
                {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* People */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                <User className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-neutral-500">Client</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{client?.name || "Unknown Client"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: therapist?.color || '#ccc' }}
              >
                {therapist?.initials || '?'}
              </div>
              <div>
                <p className="text-xs text-neutral-500">Therapist</p>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{therapist?.name || "Unknown Therapist"}</p>
              </div>
            </div>
          </div>

          {/* Attendance Toggle */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">Attendance</p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setAttendance(attendance === 'present' ? null : 'present')}
                className={clsx(
                  "py-2.5 rounded-lg text-xs font-bold transition-all border",
                  attendance === 'present' 
                    ? "bg-success-500 border-success-600 text-white shadow-sm scale-[1.02]" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                )}
              >
                Present
              </button>
              <button 
                onClick={() => setAttendance(attendance === 'absent' ? null : 'absent')}
                className={clsx(
                  "py-2.5 rounded-lg text-xs font-bold transition-all border",
                  attendance === 'absent' 
                    ? "bg-error-500 border-error-600 text-white shadow-sm scale-[1.02]" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                )}
              >
                Absent
              </button>
              <button 
                onClick={() => setAttendance(attendance === 'excused' ? null : 'excused')}
                className={clsx(
                  "py-2.5 rounded-lg text-xs font-bold transition-all border",
                  attendance === 'excused' 
                    ? "bg-warning-500 border-warning-600 text-white shadow-sm scale-[1.02]" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                )}
              >
                Excused
              </button>
            </div>
          </div>

          {/* Program Scores */}
          <div>
            <button
              type="button"
              onClick={() => setIsScoresExpanded(!isScoresExpanded)}
              className="w-full flex items-center justify-between mb-3 group"
            >
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                  Programs & Scores
                </p>
                {selectedPrograms.length > 0 && (
                  <span className="text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 px-2 py-0.5 rounded-full font-bold">
                    {selectedPrograms.length}
                  </span>
                )}
              </div>
              {selectedPrograms.length > 0 && (
                isScoresExpanded ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400 group-hover:text-neutral-600" />
                )
              )}
            </button>

            {selectedPrograms.length > 0 ? (
              isScoresExpanded && (
                <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                  {selectedPrograms.map(program => (
                    <ProgramScoreCounter
                      key={program.id}
                      programId={program.id}
                      programTitle={program.title}
                      programDescription={program.description}
                      scores={programScores[program.id] || defaultScores}
                      onChange={handleScoreChange}
                    />
                  ))}
                </div>
              )
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 italic">No programs assigned to this session.</p>
                  <p className="text-xs text-neutral-400 mt-1">Add programs when creating the event.</p>
                </div>
              </div>
            )}
          </div>

          {/* Session Notes */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">Session Notes</p>
            <textarea 
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-neutral-900 transition-all resize-none"
              rows={4}
              placeholder="Add clinical observations..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex gap-3">
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-xl text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold py-3 transition-colors shadow-lg shadow-primary-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
            ) : (
              <><Check className="w-5 h-5" /> Save Changes</>
            )}
          </button>
        </div>

      </div>
    </>
  );
}
