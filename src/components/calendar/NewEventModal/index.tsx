"use client";

import { useState } from "react";
import { X, ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { EventFormData, INITIAL_DATA } from "./types";
import StepTeam from "./StepTeam";
import StepClients from "./StepClients";
import StepPrograms from "./StepPrograms";
import StepSummary from "./StepSummary";
import { useToast } from "@/context/ToastContext";

interface NewEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void; // Callback to refresh calendar
  initialDate?: Date;
  initialTime?: string;
}

const STEPS = ["Details", "Clients", "Programs", "Summary"];

export default function NewEventModal({ 
  isOpen, 
  onClose, 
  onEventCreated,
  initialDate,
  initialTime 
}: NewEventModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EventFormData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { success, error } = useToast();

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

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Construct Event Object for Firestore
      const eventPayload = {
        title: formData.title || "Untitled Event",
        type: formData.eventType,
        // Calculate start/end ISO strings
        startTime: `${formData.date}T${formData.startTime}:00`,
        endTime: calculateEndTime(formData.date, formData.startTime, formData.duration),
        duration: formData.duration,
        
        // Relationships
        therapistId: formData.selectedTeamMembers[0] || null, // Primary therapist
        clientId: formData.selectedClients[0] || null, // Primary client
        
        // Arrays for multi-select support (future proofing schema)
        teamMemberIds: formData.selectedTeamMembers,
        clientIds: formData.selectedClients,
        programIds: formData.selectedPrograms,
        
        details: formData.details,
        status: "upcoming",
        attendance: null,
      };

      // 2. Save to Firestore
      await addDoc(collection(db, "events"), eventPayload);

      // 3. Cleanup
      setIsSubmitting(false);
      onEventCreated();
      onClose();
      setCurrentStep(0);
      setFormData(INITIAL_DATA); // Reset
      success("Event created successfully");
      
    } catch (err) {
      console.error("Error creating event:", err);
      setIsSubmitting(false);
      error("Failed to create event");
    }
  };

  // Helper to calculate end time ISO string
  const calculateEndTime = (date: string, time: string, duration: number) => {
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + duration * 60000);
    return end.toISOString();
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
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">New Event</h2>
            <p className="text-xs text-neutral-500">Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}</p>
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
            Back
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
                Saving...
              </>
            ) : currentStep === STEPS.length - 1 ? (
              <>
                Create Event
                <Check className="w-4 h-4" />
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}