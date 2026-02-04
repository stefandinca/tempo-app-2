"use client";

import { useState } from "react";
import { X, Loader2, UserPlus, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useTeamMembers } from "@/hooks/useCollections";
import { notifyClientAssigned } from "@/lib/notificationService";
import { clsx } from "clsx";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const { success, error } = useToast();
  const { user: authUser } = useAuth();
  const { data: teamMembers } = useTeamMembers();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    birthDate: "",
    diagnosisDate: "",
    primaryDiagnosis: "",
    diagnosisLevel: "1",
    phone: "",
    parentName: "",
    parentEmail: "",
    medicalInfo: "",
    assignedTherapistId: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        birthDate: formData.birthDate || null,
        diagnosisDate: formData.diagnosisDate || null,
        primaryDiagnosis: formData.primaryDiagnosis,
        diagnosisLevel: parseInt(formData.diagnosisLevel),
        phone: formData.phone,
        parentName: formData.parentName,
        parentEmail: formData.parentEmail,
        medicalInfo: formData.medicalInfo,
        assignedTherapistId: formData.assignedTherapistId,
        progress: 0,
        isArchived: false,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "clients"), payload);
      success("Client added successfully");

      // Send notification to therapist if assigned
      if (formData.assignedTherapistId && authUser) {
        notifyClientAssigned(formData.assignedTherapistId, {
          clientId: docRef.id,
          clientName: formData.name,
          triggeredByUserId: authUser.uid
        }).catch(err => console.error("Failed to send assignment notification:", err));
      }

      setFormData({
        name: "",
        birthDate: "",
        diagnosisDate: "",
        primaryDiagnosis: "",
        diagnosisLevel: "1",
        phone: "",
        parentName: "",
        parentEmail: "",
        medicalInfo: "",
        assignedTherapistId: "",
      });
      onClose();
    } catch (err) {
      console.error(err);
      error("Failed to add client");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Add New Client</h2>
              <p className="text-xs text-neutral-500">Register a new child into the system</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Child Name</label>
              <input
                type="text"
                required
                placeholder="e.g. John Doe"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Birth Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.birthDate}
                onChange={e => setFormData({...formData, birthDate: e.target.value})}
              />
            </div>
          </div>

          {/* Clinical Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Primary Diagnosis</label>
              <input
                type="text"
                placeholder="e.g. Autism Spectrum Disorder"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.primaryDiagnosis}
                onChange={e => setFormData({...formData, primaryDiagnosis: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Diagnosis Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.diagnosisDate}
                onChange={e => setFormData({...formData, diagnosisDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Support Level (DSM-5)</label>
              <select
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.diagnosisLevel}
                onChange={e => setFormData({...formData, diagnosisLevel: e.target.value})}
              >
                <option value="1">Level 1 (Requiring Support)</option>
                <option value="2">Level 2 (Substantial Support)</option>
                <option value="3">Level 3 (Very Substantial Support)</option>
              </select>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              Phone Number <span className="text-neutral-400 font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 0721 234 567"
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          {/* Parent Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                Parent Name <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Robert Doe"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.parentName}
                onChange={e => setFormData({...formData, parentName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                Parent Email <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                type="email"
                placeholder="parent@example.com"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.parentEmail}
                onChange={e => setFormData({...formData, parentEmail: e.target.value})}
              />
            </div>
          </div>

          {/* Therapist Assignment */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Assigned Therapist</label>
            <select
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.assignedTherapistId}
              onChange={e => setFormData({...formData, assignedTherapistId: e.target.value})}
            >
              <option value="">Select a therapist...</option>
              {teamMembers.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.role})</option>
              ))}
            </select>
          </div>

          {/* Medical Info */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Medical Info / Notes</label>
            <textarea 
              rows={3}
              placeholder="Allergies, specific diagnosis notes..."
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 resize-none"
              value={formData.medicalInfo}
              onChange={e => setFormData({...formData, medicalInfo: e.target.value})}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Register Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
