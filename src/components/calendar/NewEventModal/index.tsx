"use client";

import { useState, useEffect, useCallback } from "react";
import { X, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { collection, addDoc, writeBatch, doc, updateDoc } from "firebase/firestore";
import { EventFormData, INITIAL_DATA } from "./types";
import StepTeam from "./StepTeam";
import StepClients from "./StepClients";
import StepPrograms from "./StepPrograms";
import StepSummary from "./StepSummary";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { notifySessionCreated, notifyParentSessionCreated, notifySessionRescheduled, notifyParentSessionRescheduled } from "@/lib/notificationService";
import { useTranslation } from "react-i18next";

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void; // Callback to refresh calendar
  initialDate?: Date;
  initialTime?: string;
  initialClientId?: string;
  initialEventType?: string;
  initialTitle?: string;
  editingEvent?: any; // Existing event to edit
}

export default function NewEventModal({
  isOpen,
  onClose,
  onEventCreated,
  initialDate,
  initialTime,
  initialClientId,
  initialEventType,
  initialTitle,
  editingEvent
}: NewEventModalProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EventFormData>(() => ({
    ...INITIAL_DATA,
    selectedClients: initialClientId ? [initialClientId] : []
  }));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();
  const { user } = useAuth();
  const { clients, teamMembers } = useData();

  const isEditMode = !!editingEvent;

  const STEPS = [
    t('event_modal.steps.details'),
    t('event_modal.steps.clients'),
    t('event_modal.steps.programs'),
    t('event_modal.steps.summary')
  ];

  // Reset form when modal opens with new initial data
  const resetForm = useCallback(() => {
    setCurrentStep(0);

    if (editingEvent) {
      // Editing mode: Pre-populate form with existing event data
      const startDate = new Date(editingEvent.startTime);
      const endDate = new Date(editingEvent.endTime);
      const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);

      setFormData({
        title: editingEvent.title || "",
        details: editingEvent.details || "",
        eventType: editingEvent.type || "",
        selectedTeamMembers: editingEvent.teamMemberIds || (editingEvent.therapistId ? [editingEvent.therapistId] : []),
        date: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        duration: durationMinutes || 60,
        isRecurring: false,
        recurrenceDays: [],
        recurrenceEndDate: "",
        selectedClients: editingEvent.clientIds || (editingEvent.clientId ? [editingEvent.clientId] : []),
        selectedPrograms: editingEvent.programIds || []
      });
    } else {
      // Create mode: Use initial values or defaults
      setFormData({
        ...INITIAL_DATA,
        selectedClients: initialClientId ? [initialClientId] : [],
        date: initialDate ? initialDate.toISOString().split('T')[0] : INITIAL_DATA.date,
        startTime: initialTime || INITIAL_DATA.startTime,
        eventType: initialEventType || INITIAL_DATA.eventType,
        title: initialTitle || INITIAL_DATA.title
      });
    }
  }, [initialClientId, initialDate, initialTime, initialEventType, initialTitle, editingEvent]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const updateData = (updates: Partial<EventFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Helper to generate dates for recurring events
  const generateRecurringDates = (start: string, end: string, days: number[]) => {
    const dates: string[] = [];
    const curr = new Date(start);
    const endDate = new Date(end);
    
    // Safety break: if end date is invalid or before start, return just start
    if (isNaN(endDate.getTime()) || endDate < curr) return [start]; 

    // Safety limit: Max 100 events to prevent infinite loops or massive writes
    let count = 0;
    while (curr <= endDate && count < 100) {
      if (days.includes(curr.getDay())) {
        dates.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return dates;
  };

  // Helper to calculate end time ISO string
  const calculateEndTime = (date: string, time: string, duration: number) => {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + duration * 60000);
    return end.toISOString();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (isEditMode && editingEvent) {
        // UPDATE existing event
        const newStartTime = `${formData.date}T${formData.startTime}:00`;
        const newEndTime = calculateEndTime(formData.date, formData.startTime, formData.duration);

        const updatePayload = {
          title: formData.title || "Untitled Event",
          type: formData.eventType,
          duration: formData.duration,
          therapistId: formData.selectedTeamMembers[0] || null,
          clientId: formData.selectedClients[0] || null,
          teamMemberIds: formData.selectedTeamMembers,
          clientIds: formData.selectedClients,
          programIds: formData.selectedPrograms,
          details: formData.details,
          startTime: newStartTime,
          endTime: newEndTime,
          updatedAt: new Date().toISOString()
        };

        const eventRef = doc(db, "events", editingEvent.id);
        await updateDoc(eventRef, updatePayload);

        // Check if rescheduled (date/time changed)
        const wasRescheduled = newStartTime !== editingEvent.startTime;

        if (user && wasRescheduled) {
          try {
            const clientName = formData.selectedClients[0]
              ? (clients?.data || []).find((c: any) => c.id === formData.selectedClients[0])?.name
              : undefined;

            const adminIds = (teamMembers?.data || [])
              .filter((m: any) => m.role === "Admin" || m.role === "Coordinator")
              .map((m: any) => m.id);

            const allRecipients = Array.from(new Set([...formData.selectedTeamMembers, ...adminIds]));

            notifySessionRescheduled(allRecipients, {
              eventId: editingEvent.id,
              eventTitle: formData.title || "Untitled Event",
              eventType: formData.eventType,
              startTime: newStartTime,
              oldStartTime: editingEvent.startTime,
              clientName,
              triggeredByUserId: user.uid
            }).catch((err) => console.error("Failed to send notifications:", err));

            // Notify parent
            if (formData.selectedClients[0]) {
              const therapistName = formData.selectedTeamMembers[0]
                ? (teamMembers?.data || []).find((t: any) => t.id === formData.selectedTeamMembers[0])?.name
                : undefined;

              notifyParentSessionRescheduled(formData.selectedClients[0], {
                eventId: editingEvent.id,
                eventTitle: formData.title || "Untitled Event",
                eventType: formData.eventType,
                startTime: newStartTime,
                oldStartTime: editingEvent.startTime,
                therapistName,
                triggeredByUserId: user.uid
              }).catch((err) => console.error("Failed to send parent notifications:", err));
            }
          } catch (notifErr) {
            console.error("Error preparing notifications:", notifErr);
          }
        }

        setIsSubmitting(false);
        onEventCreated();
        onClose();
        success(t('event_modal.update_success') || "Event updated successfully");

      } else {
        // CREATE new event(s)
        const batch = writeBatch(db);

        // Determine dates to create
        const datesToCreate = (formData.isRecurring && formData.recurrenceEndDate && formData.recurrenceDays.length > 0)
          ? generateRecurringDates(formData.date, formData.recurrenceEndDate, formData.recurrenceDays)
          : [formData.date];

        // Generate Group ID if recurring
        const recurringGroupId = formData.isRecurring && datesToCreate.length > 1
          ? Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
          : null;

        // Base payload shared by all events
        const basePayload = {
          title: formData.title || "Untitled Event",
          type: formData.eventType,
          duration: formData.duration,
          therapistId: formData.selectedTeamMembers[0] || null,
          clientId: formData.selectedClients[0] || null,
          teamMemberIds: formData.selectedTeamMembers,
          clientIds: formData.selectedClients,
          programIds: formData.selectedPrograms,
          details: formData.details,
          status: "upcoming",
          attendance: null,
          recurringGroupId,
          createdAt: new Date().toISOString()
        };

        // Create documents in batch
        datesToCreate.forEach(dateStr => {
          const ref = doc(collection(db, "events"));
          batch.set(ref, {
            ...basePayload,
            startTime: `${dateStr}T${formData.startTime}:00`,
            endTime: calculateEndTime(dateStr, formData.startTime, formData.duration),
          });
        });

        // Commit batch
        await batch.commit();

        // Send notifications to assigned team members (non-blocking)
        if (user && formData.selectedTeamMembers.length > 0) {
          try {
            const clientName = formData.selectedClients[0]
              ? (clients?.data || []).find((c: any) => c.id === formData.selectedClients[0])?.name
              : undefined;

            // Notify all team members (except the creator) and admins/coordinators
            const adminIds = (teamMembers?.data || [])
              .filter((m: any) => m.role === "Admin" || m.role === "Coordinator")
              .map((m: any) => m.id);

            const allRecipients = Array.from(new Set([...formData.selectedTeamMembers, ...adminIds]));

            notifySessionCreated(allRecipients, {
              eventId: "batch-created",
              eventTitle: formData.title || "Untitled Event",
              eventType: formData.eventType,
              startTime: `${datesToCreate[0]}T${formData.startTime}:00`,
              clientName,
              triggeredByUserId: user.uid
            }).catch((err) => console.error("Failed to send notifications:", err));

            // Also notify parents if a client is associated
            if (formData.selectedClients[0]) {
              const therapistName = formData.selectedTeamMembers[0]
                ? (teamMembers?.data || []).find((t: any) => t.id === formData.selectedTeamMembers[0])?.name
                : undefined;

              notifyParentSessionCreated(formData.selectedClients[0], {
                eventId: "batch-created",
                eventTitle: formData.title || "Untitled Event",
                eventType: formData.eventType,
                startTime: `${datesToCreate[0]}T${formData.startTime}:00`,
                therapistName,
                triggeredByUserId: user.uid
              }).catch((err) => console.error("Failed to send parent notifications:", err));
            }
          } catch (notifErr) {
            console.error("Error preparing notifications:", notifErr);
          }
        }

        // Cleanup
        setIsSubmitting(false);
        onEventCreated();
        onClose();
        success(`Successfully created ${datesToCreate.length} event(s)`);
      }

    } catch (err) {
      console.error("Error saving event:", err);
      setIsSubmitting(false);
      error(isEditMode ? "Failed to update event" : "Failed to create event");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">
              {isEditMode ? (t('event_modal.title_edit') || 'Edit Event') : t('event_modal.title_new')}
            </h2>
            <p className="text-xs text-neutral-500">{t('event_modal.step', { current: currentStep + 1, total: STEPS.length })}: {STEPS[currentStep]}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-neutral-100 dark:bg-neutral-800 w-full">
          <div 
            className="h-full bg-primary-500 transition-all duration-300 ease-out"
            style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {currentStep === 0 && <StepTeam data={formData} updateData={updateData} />}
          {currentStep === 1 && <StepClients data={formData} updateData={updateData} />}
          {currentStep === 2 && <StepPrograms data={formData} updateData={updateData} />}
          {currentStep === 3 && <StepSummary data={formData} />}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex justify-between items-center">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2",
              currentStep === 0
                ? "text-neutral-400 cursor-not-allowed"
                : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            {t('common.back') || 'Back'}
          </button>

          <button
            onClick={handleNext}
            disabled={isSubmitting}
            className={clsx(
              "px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 shadow-sm",
              isSubmitting 
                ? "bg-primary-400 cursor-wait" 
                : "bg-primary-600 hover:bg-primary-700 text-white"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : currentStep === STEPS.length - 1 ? (
              <>
                {isEditMode ? (t('common.save') || 'Save') : t('event_modal.create')}
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                {t('common.next') || 'Next'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}