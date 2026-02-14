"use client";

import { useState } from "react";
import { X, Loader2, UserPlus, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useTeamMembers } from "@/hooks/useCollections";
import { useData } from "@/context/DataContext";
import { useConfirm } from "@/context/ConfirmContext";
import { notifyClientAssigned } from "@/lib/notificationService";
import { logActivity } from "@/lib/activityService";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface AddClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AddClientModal({ isOpen, onClose }: AddClientModalProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { user: authUser, userData } = useAuth();
  const { data: teamMembers } = useTeamMembers();
  const { clients: clientsData, systemSettings } = useData();
  const { confirm } = useConfirm();
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

    // Check client limit
    const maxClients = systemSettings?.maxActiveClients || 0;
    if (maxClients > 0) {
      const activeCount = clientsData.data.filter((c: any) => !c.isArchived).length;
      if (activeCount >= maxClients) {
        setIsSubmitting(false);
        confirm({
          title: t('limits.client_limit_reached_title'),
          message: t('limits.client_limit_reached_message', { max: maxClients }),
          confirmLabel: 'OK',
          variant: 'warning',
          onConfirm: () => {},
        });
        return;
      }
    }

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
      success(t('clients.add_modal.success'));

      // Log activity for client creation
      if (authUser && userData) {
        try {
          await logActivity({
            type: 'client_created',
            userId: authUser.uid,
            userName: userData.name || authUser.email || 'Unknown',
            userPhotoURL: userData.photoURL || authUser.photoURL || undefined,
            targetId: docRef.id,
            targetName: formData.name
          });
        } catch (activityError) {
          console.error('Failed to log activity:', activityError);
        }
      }

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
      error(t('clients.add_modal.error'));
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
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{t('clients.add_modal.title')}</h2>
              <p className="text-xs text-neutral-500">{t('clients.add_modal.subtitle')}</p>
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
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.child_name')}</label>
              <input
                type="text"
                required
                placeholder={t('clients.form.child_name_placeholder')}
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.birth_date')}</label>
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
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.primary_diagnosis')}</label>
              <input
                type="text"
                placeholder={t('clients.form.diagnosis_placeholder')}
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.primaryDiagnosis}
                onChange={e => setFormData({...formData, primaryDiagnosis: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.diagnosis_date')}</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.diagnosisDate}
                onChange={e => setFormData({...formData, diagnosisDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.support_level')}</label>
              <select
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.diagnosisLevel}
                onChange={e => setFormData({...formData, diagnosisLevel: e.target.value})}
              >
                <option value="1">{t('clients.form.level_1')}</option>
                <option value="2">{t('clients.form.level_2')}</option>
                <option value="3">{t('clients.form.level_3')}</option>
              </select>
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
              {t('clients.form.phone')} <span className="text-neutral-400 font-normal">{t('clients.form.optional')}</span>
            </label>
            <input
              type="tel"
              placeholder={t('clients.form.phone_placeholder')}
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
            />
          </div>

          {/* Parent Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                {t('clients.form.parent_name')} <span className="text-neutral-400 font-normal">{t('clients.form.optional')}</span>
              </label>
              <input
                type="text"
                placeholder={t('clients.form.parent_name_placeholder')}
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.parentName}
                onChange={e => setFormData({...formData, parentName: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                {t('clients.form.parent_email')} <span className="text-neutral-400 font-normal">{t('clients.form.optional')}</span>
              </label>
              <input
                type="email"
                placeholder={t('clients.form.parent_email_placeholder')}
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.parentEmail}
                onChange={e => setFormData({...formData, parentEmail: e.target.value})}
              />
            </div>
          </div>

          {/* Therapist Assignment */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.assigned_therapist')}</label>
            <select
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.assignedTherapistId}
              onChange={e => setFormData({...formData, assignedTherapistId: e.target.value})}
            >
              <option value="">{t('clients.form.select_therapist')}</option>
              {teamMembers.filter(tm => tm.role !== 'Superadmin').map(tm => (
                <option key={tm.id} value={tm.id}>{tm.name} ({tm.role})</option>
              ))}
            </select>
          </div>

          {/* Medical Info */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.medical_info')}</label>
            <textarea
              rows={3}
              placeholder={t('clients.form.medical_info_placeholder')}
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
              {t('clients.add_modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('clients.add_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
