"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
  ChevronUp,
  Plus,
  Minus,
  Search,
  Pencil
} from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useClients, useTeamMembers, usePrograms } from "@/hooks/useCollections";
import ProgramScoreCounter, { ProgramScores } from "./ProgramScoreCounter";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import {
  notifySessionRescheduled,
  notifySessionCancelled,
  notifyAttendanceLogged,
  notifyParentSessionRescheduled,
  notifyParentSessionCancelled,
  notifyParentAttendanceLogged
} from "@/lib/notificationService";
import { useEventModal } from "@/context/EventModalContext";
import { useConfirm } from "@/context/ConfirmContext";

interface EventDetailPanelProps {
  event: any; // Firestore Event Document
  isOpen: boolean;
  onClose: () => void;
}

export default function EventDetailPanel({ event, isOpen, onClose }: EventDetailPanelProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { user: authUser, userRole } = useAuth();
  const { confirm: customConfirm } = useConfirm();
  const { data: clients } = useClients();
  const { data: teamMembers } = useTeamMembers();
  const { data: programs } = usePrograms();
  const { openModal } = useEventModal();

  // Local state for editing
  const [attendance, setAttendance] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [isSaving, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [programScores, setProgramScores] = useState<Record<string, ProgramScores>>({});
  const [isScoresExpanded, setIsScoresExpanded] = useState(true);
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([]);
  const [isProgramSelectorOpen, setIsProgramSelectorOpen] = useState(false);
  const [isRemoveModeActive, setIsRemoveModeActive] = useState(false);
  const [programSearch, setProgramSearch] = useState("");
  const [programNotes, setProgramNotes] = useState<Record<string, string>>({});

  // Track original values for detecting changes
  const [originalDate, setOriginalDate] = useState("");
  const [originalTime, setOriginalTime] = useState("");
  const [originalAttendance, setOriginalAttendance] = useState<string | null>(null);

  // Permission Logic - Any team member (Admin, Coordinator, Therapist) can edit any event
  const canEdit =
    userRole === 'Superadmin' ||
    userRole === 'Admin' ||
    userRole === 'Coordinator' ||
    userRole === 'Therapist';

  // Default scores for a new program
  const defaultScores: ProgramScores = useMemo(() => ({ minus: 0, zero: 0, prompted: 0, plus: 0 }), []);

  // Sync state when event changes
  useEffect(() => {
    if (event) {
      setAttendance(event.attendance || null);
      setOriginalAttendance(event.attendance || null);
      setNotes(event.details || "");

      // Parse ISO string for inputs
      const d = new Date(event.startTime);
      const dateStr = d.toISOString().split('T')[0];
      const timeStr = d.toTimeString().slice(0, 5);
      setDate(dateStr);
      setTime(timeStr);
      setOriginalDate(dateStr);
      setOriginalTime(timeStr);

      // Sync selected programs
      setSelectedProgramIds(event.programIds || []);

      // Initialize program scores from event or create defaults
      const existingScores = event.programScores || {};
      const initialScores: Record<string, ProgramScores> = {};

      (event.programIds || []).forEach((programId: string) => {
        initialScores[programId] = existingScores[programId] || { ...defaultScores };
      });

      setProgramScores(initialScores);

      // Initialize program notes from event
      setProgramNotes(event.programNotes || {});

      // Reset program selector state
      setIsProgramSelectorOpen(false);
      setIsRemoveModeActive(false);
      setProgramSearch("");
    }
  }, [event, defaultScores]);

  // Handle score changes
  const handleScoreChange = useCallback((programId: string, scores: ProgramScores) => {
    if (!canEdit) return;
    setProgramScores(prev => ({
      ...prev,
      [programId]: scores
    }));
  }, [canEdit]);

  // Toggle program selection
  const toggleProgram = useCallback((programId: string) => {
    if (!canEdit) return;
    setSelectedProgramIds(prev => {
      const isSelected = prev.includes(programId);
      if (isSelected) {
        // Remove program and its scores
        setProgramScores(currentScores => {
          const newScores = { ...currentScores };
          delete newScores[programId];
          return newScores;
        });
        return prev.filter(id => id !== programId);
      } else {
        // Add program with default scores
        setProgramScores(currentScores => ({
          ...currentScores,
          [programId]: { ...defaultScores }
        }));
        return [...prev, programId];
      }
    });
  }, [canEdit, defaultScores]);

  // Detect unsaved changes
  const hasUnsavedChanges = attendance !== originalAttendance || date !== originalDate || time !== originalTime || notes !== (event?.details || "") || JSON.stringify(programNotes) !== JSON.stringify(event?.programNotes || {});

  const handleClose = () => {
    if (hasUnsavedChanges && canEdit) {
      customConfirm({
        title: t('calendar.event.unsaved_title') || 'Unsaved Changes',
        message: t('calendar.event.unsaved_message') || 'You have unsaved changes. Are you sure you want to close?',
        confirmLabel: t('calendar.event.discard') || 'Discard',
        variant: 'danger',
        onConfirm: () => onClose()
      });
    } else {
      onClose();
    }
  };

  if (!event) return null;

  const client = (clients || []).find(c => c.id === event.clientId);
  const therapist = (teamMembers || []).find(t => t.id === event.therapistId);
  const selectedPrograms = (programs || []).filter(p => selectedProgramIds.includes(p.id));

  // Filter programs for the selector (exclude already selected)
  const availablePrograms = (programs || []).filter(p =>
    !selectedProgramIds.includes(p.id) &&
    (p.title.toLowerCase().includes(programSearch.toLowerCase()) ||
     (p.description || "").toLowerCase().includes(programSearch.toLowerCase()))
  );

  const handleSave = async () => {
    if (!canEdit) {
      error(t('calendar.event.error_permission'));
      return;
    }
    setIsSubmitting(true);
    try {
      // Reconstruct start/end times based on new date/time input
      const newStart = new Date(`${date}T${time}:00`);
      const duration = typeof event.duration === 'number' && event.duration > 0 ? event.duration : 60;
      const newEnd = new Date(newStart.getTime() + duration * 60000);

      const eventRef = doc(db, "events", event.id);
      // Filter programNotes to only include selected programs
      const filteredProgramNotes: Record<string, string> = {};
      selectedProgramIds.forEach(id => {
        if (programNotes[id]) filteredProgramNotes[id] = programNotes[id];
      });

      await updateDoc(eventRef, {
        attendance,
        details: notes,
        programIds: selectedProgramIds,
        programScores,
        programNotes: filteredProgramNotes,
        status: attendance ? "completed" : "upcoming",
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString()
      });

      // Send notifications for changes
      if (authUser) {
        const clientName = client?.name;
        const notificationContext = {
          eventId: event.id,
          eventTitle: event.title,
          eventType: event.type,
          startTime: newStart.toISOString(),
          clientName,
          triggeredByUserId: authUser.uid
        };

        // Get all admins/coordinators for notifications
        const adminIds = (teamMembers || [])
          .filter((m: any) => m.role === "Admin" || m.role === "Coordinator")
          .map((m: any) => m.id);
        const allRecipients = Array.from(new Set([...(event.teamMemberIds || []), ...adminIds]));

        // Check if date/time changed (reschedule)
        const wasRescheduled = date !== originalDate || time !== originalTime;
        if (wasRescheduled) {
          notifySessionRescheduled(allRecipients, {
            ...notificationContext,
            oldStartTime: event.startTime
          }).catch((err) => console.error("Failed to send reschedule notification:", err));

          // Also notify parents
          if (event.clientId) {
            const therapistName = therapist?.name;
            notifyParentSessionRescheduled(event.clientId, {
              eventId: event.id,
              eventTitle: event.title,
              eventType: event.type,
              startTime: newStart.toISOString(),
              therapistName,
              triggeredByUserId: authUser.uid,
              oldStartTime: event.startTime
            }).catch((err) => console.error("Failed to send parent reschedule notification:", err));
          }
        }

        // Check if attendance was just logged or changed (and is not null)
        const attendanceChanged = originalAttendance !== attendance && attendance !== null;
        if (attendanceChanged) {
          notifyAttendanceLogged(adminIds, {
            ...notificationContext,
            attendance: attendance!
          }).catch((err) => console.error("Failed to send attendance notification:", err));

          // Also notify parents
          if (event.clientId) {
            const therapistName = therapist?.name;
            notifyParentAttendanceLogged(event.clientId, {
              eventId: event.id,
              eventTitle: event.title,
              eventType: event.type,
              startTime: newStart.toISOString(),
              therapistName,
              triggeredByUserId: authUser.uid,
              attendance: attendance!
            }).catch((err) => console.error("Failed to send parent attendance notification:", err));
          }
        }
      }

      success(t('calendar.event.save_success'));
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error(err);
      error(t('calendar.event.error_update'));
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!canEdit) {
      error(t('calendar.event.error_permission'));
      return;
    }
    
    customConfirm({
      title: t('common.delete'),
      message: t('calendar.event.delete_confirm'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          // Send cancellation notifications before deleting
          if (authUser) {
            const clientName = client?.name;
            const adminIds = (teamMembers || [])
              .filter((m: any) => m.role === "Admin" || m.role === "Coordinator")
              .map((m: any) => m.id);
            const allRecipients = Array.from(new Set([...(event.teamMemberIds || []), ...adminIds]));

            notifySessionCancelled(allRecipients, {
              eventId: event.id,
              eventTitle: event.title,
              eventType: event.type,
              startTime: event.startTime,
              clientName,
              triggeredByUserId: authUser.uid
            }).catch((err) => console.error("Failed to send cancellation notification:", err));

            // Also notify parents
            if (event.clientId) {
              const therapistName = therapist?.name;
              notifyParentSessionCancelled(event.clientId, {
                eventId: event.id,
                eventTitle: event.title,
                eventType: event.type,
                startTime: event.startTime,
                therapistName,
                triggeredByUserId: authUser.uid
              }).catch((err) => console.error("Failed to send parent cancellation notification:", err));
            }
          }

          await deleteDoc(doc(db, "events", event.id));
          success(t('calendar.event.delete_success'));
          setIsDeleting(false);
          onClose();
        } catch (err) {
          console.error(err);
          error(t('calendar.event.error_delete'));
          setIsDeleting(false);
        }
      }
    });
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={handleClose}
      />

      {/* Panel */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-neutral-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-neutral-200 dark:border-neutral-800",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">{t('calendar.event.details')}</h3>
            {!canEdit && (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-neutral-100 text-neutral-500 rounded">{t('calendar.event.readonly')}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {canEdit && (
              <button
                onClick={() => {
                  onClose();
                  openModal({ editingEvent: event });
                }}
                className="p-2 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-600 transition-colors"
                title={t('common.edit') || 'Edit'}
              >
                <Pencil className="w-5 h-5" />
              </button>
            )}
            <button onClick={handleClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
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
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{t('calendar.event.date')}</p>
              {canEdit ? (
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-sm font-medium text-neutral-700 dark:text-neutral-300 focus:ring-0"
                />
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(event.startTime).toLocaleDateString(i18n.language || 'ro')}
                </div>
              )}
            </div>
            <div className="bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">{t('calendar.event.time')}</p>
              {canEdit ? (
                <input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-transparent border-none p-0 text-sm font-medium text-neutral-700 dark:text-neutral-300 focus:ring-0"
                />
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(event.startTime).toLocaleTimeString(i18n.language || 'ro', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>

          {/* People */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600">
                <User className="w-4 h-4" />
              </div>
                          <div>
                            <p className="text-xs text-neutral-500">{t('calendar.event.client')}</p>
                            <Link 
                              href={client ? `/clients/profile?id=${client.id}` : "#"} 
                              className="text-sm font-medium text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                              {client?.name || "Unknown Client"}
                            </Link>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                            style={{ backgroundColor: therapist?.photoURL ? 'transparent' : (therapist?.color || '#ccc') }}
                          >
                            {therapist?.photoURL ? (
                              <img src={therapist.photoURL} alt={therapist.name} className="w-full h-full object-cover" />
                            ) : (
                              therapist?.initials || '?'
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-neutral-500">{t('calendar.event.therapist')}</p>
                            <Link 
                              href="/team/" 
                              className="text-sm font-medium text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                            >
                              {therapist?.name || "Unknown Therapist"}
                            </Link>
                          </div>
                        </div>          </div>

          {/* Attendance Toggle */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">{t('calendar.event.attendance')}</p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => canEdit && setAttendance(attendance === 'present' ? null : 'present')}
                disabled={!canEdit}
                className={clsx(
                  "py-2.5 rounded-lg text-xs font-bold transition-all border",
                  !canEdit ? "opacity-50 cursor-not-allowed" : "",
                  attendance === 'present' 
                    ? "bg-success-500 border-success-600 text-white shadow-sm scale-[1.02]" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                )}
              >
                {t('attendance.present')}
              </button>
              <button 
                onClick={() => canEdit && setAttendance(attendance === 'absent' ? null : 'absent')}
                disabled={!canEdit}
                className={clsx(
                  "py-2.5 rounded-lg text-xs font-bold transition-all border",
                  !canEdit ? "opacity-50 cursor-not-allowed" : "",
                  attendance === 'absent' 
                    ? "bg-error-500 border-error-600 text-white shadow-sm scale-[1.02]" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                )}
              >
                {t('attendance.absent')}
              </button>
              <button 
                onClick={() => canEdit && setAttendance(attendance === 'excused' ? null : 'excused')}
                disabled={!canEdit}
                className={clsx(
                  "py-2.5 rounded-lg text-xs font-bold transition-all border",
                  !canEdit ? "opacity-50 cursor-not-allowed" : "",
                  attendance === 'excused' 
                    ? "bg-warning-500 border-warning-600 text-white shadow-sm scale-[1.02]" 
                    : "bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50"
                )}
              >
                {t('attendance.excused')}
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
                  {t('calendar.event.programs_scores')}
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
                    <div key={program.id} className="relative">
                      <ProgramScoreCounter
                        programId={program.id}
                        programTitle={program.title}
                        programDescription={program.description}
                        scores={programScores[program.id] || defaultScores}
                        onChange={handleScoreChange}
                        disabled={!canEdit}
                      />
                      {/* Per-program notes */}
                      {(canEdit || programNotes[program.id]) && (
                        <textarea
                          placeholder={t('calendar.event.program_notes_placeholder')}
                          value={programNotes[program.id] || ""}
                          onChange={(e) => setProgramNotes(prev => ({ ...prev, [program.id]: e.target.value }))}
                          disabled={!canEdit}
                          rows={2}
                          className="w-full mt-1.5 px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-neutral-900 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      )}
                      {/* Remove program button - only visible in remove mode */}
                      {isRemoveModeActive && (
                        <button
                          type="button"
                          onClick={() => toggleProgram(program.id)}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white rounded-full flex items-center justify-center shadow-sm hover:bg-error-600 transition-colors animate-in zoom-in duration-150"
                          title="Remove program"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800">
                <div className="text-center py-4">
                  <BookOpen className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
                  <p className="text-sm text-neutral-500 italic">{t('calendar.event.no_programs')}</p>
                </div>
              </div>
            )}

            {/* Add/Remove Program Buttons & Selector */}
            {canEdit && (
              <div className="mt-3">
                {isProgramSelectorOpen ? (
                  <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3 border border-neutral-200 dark:border-neutral-700 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="relative mb-2">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                      <input
                        type="text"
                        placeholder={t('calendar.event.search_programs')}
                        className="w-full pl-8 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        value={programSearch}
                        onChange={(e) => setProgramSearch(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {availablePrograms.length === 0 ? (
                        <p className="text-xs text-neutral-500 text-center py-3">
                          {programSearch ? t('calendar.event.no_matching_programs') : t('calendar.event.all_assigned')}
                        </p>
                      ) : (
                        availablePrograms.map(program => (
                          <button
                            key={program.id}
                            type="button"
                            onClick={() => {
                              toggleProgram(program.id);
                              setProgramSearch("");
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-white dark:hover:bg-neutral-900 transition-colors text-left"
                          >
                            <div className="w-5 h-5 rounded border border-neutral-300 dark:border-neutral-600 flex items-center justify-center flex-shrink-0">
                              <Plus className="w-3 h-3 text-neutral-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">{program.title}</p>
                              <p className="text-xs text-neutral-500 truncate">{program.description}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsProgramSelectorOpen(false);
                        setProgramSearch("");
                      }}
                      className="w-full mt-2 py-1.5 text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
                    >
                      {t('common.close') || 'Close'}
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProgramSelectorOpen(true);
                        setIsRemoveModeActive(false);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl text-sm text-neutral-500 hover:text-primary-600 hover:border-primary-400 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      {t('calendar.event.add_program')}
                    </button>
                    {selectedPrograms.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setIsRemoveModeActive(!isRemoveModeActive)}
                        className={clsx(
                          "flex-1 flex items-center justify-center gap-2 py-2.5 border rounded-xl text-sm transition-colors",
                          isRemoveModeActive
                            ? "border-error-400 bg-error-50 dark:bg-error-900/20 text-error-600"
                            : "border-dashed border-neutral-300 dark:border-neutral-700 text-neutral-500 hover:text-error-600 hover:border-error-400"
                        )}
                      >
                        <Minus className="w-4 h-4" />
                        {isRemoveModeActive ? (t('common.done') || "Done") : t('calendar.event.remove_program')}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Session Notes */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{t('calendar.event.notes')}</p>
            <textarea 
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:bg-white dark:focus:bg-neutral-900 transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              rows={4}
              placeholder={t('calendar.event.notes_placeholder')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!canEdit}
            />
          </div>

        </div>

        {/* Footer Actions */}
        {canEdit && (
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
                <><Loader2 className="w-5 h-5 animate-spin" /> {t('common.saving')}</>
              ) : (
                <><Check className="w-5 h-5" /> {t('common.save')}</>
              )}
            </button>
          </div>
        )}

      </div>
    </>
  );
}
