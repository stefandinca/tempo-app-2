"use client";

import { useState, useEffect } from "react";
import { X, Loader2, UserPlus, Check, Save, Plus, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { useTeamMembers } from "@/hooks/useCollections";
import { notifyClientAssigned } from "@/lib/notificationService";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: any;
}

export default function EditClientModal({ isOpen, onClose, client }: EditClientModalProps) {
  const { t } = useTranslation();
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
    therapistIds: [] as string[],
    billingAddress: "",
    billingCif: "",
    billingRegNo: "",
  });

  // Load client data when modal opens
  useEffect(() => {
    if (client && isOpen) {
      setFormData({
        name: client.name || "",
        birthDate: client.birthDate || "",
        diagnosisDate: client.diagnosisDate || "",
        primaryDiagnosis: client.primaryDiagnosis || "",
        diagnosisLevel: client.diagnosisLevel?.toString() || "1",
        phone: client.phone || "",
        parentName: client.parentName || "",
        parentEmail: client.parentEmail || "",
        medicalInfo: client.medicalInfo || "",
        therapistIds: client.therapistIds || (client.assignedTherapistId ? [client.assignedTherapistId] : []),
        billingAddress: client.billingAddress || "",
        billingCif: client.billingCif || "",
        billingRegNo: client.billingRegNo || "",
      });
    }
  }, [client, isOpen]);

  const toggleTherapist = (id: string) => {
    setFormData(prev => ({
      ...prev,
      therapistIds: prev.therapistIds.includes(id) 
        ? prev.therapistIds.filter(tid => tid !== id)
        : [...prev.therapistIds, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const clientRef = doc(db, "clients", client.id);
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
        therapistIds: formData.therapistIds,
        // Keep legacy field for compatibility if needed, but primary is now therapistIds
        assignedTherapistId: formData.therapistIds[0] || "",
        billingAddress: formData.billingAddress,
        billingCif: formData.billingCif,
        billingRegNo: formData.billingRegNo,
      };

      await updateDoc(clientRef, payload);
      
      // Notify NEWLY assigned members
      if (authUser) {
        const oldIds = client.therapistIds || (client.assignedTherapistId ? [client.assignedTherapistId] : []);
        const newIds = formData.therapistIds.filter(id => !oldIds.includes(id));
        
        for (const id of newIds) {
          notifyClientAssigned(id, {
            clientId: client.id,
            clientName: formData.name,
            triggeredByUserId: authUser.uid
          }).catch(err => console.error("Failed to send assignment notification:", err));
        }
      }

      success(t('clients.edit_modal.success'));
      onClose();
    } catch (err) {
      console.error(err);
      error(t('clients.edit_modal.error'));
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
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-white">{t('clients.edit_modal.title')}</h2>
              <p className="text-xs text-neutral-500">{t('clients.edit_modal.subtitle', { name: client?.name })}</p>
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
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.birth_date')}</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
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
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
                value={formData.primaryDiagnosis}
                onChange={e => setFormData({...formData, primaryDiagnosis: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.diagnosis_date')}</label>
              <input
                type="date"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
                value={formData.diagnosisDate}
                onChange={e => setFormData({...formData, diagnosisDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.support_level')}</label>
              <select
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
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
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
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
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
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
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
                value={formData.parentEmail}
                onChange={e => setFormData({...formData, parentEmail: e.target.value})}
              />
            </div>
          </div>

          {/* Billing Info */}
          <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white mb-4">{t('clients.form.billing_section')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.billing_address')}</label>
                <input
                  type="text"
                  placeholder={t('clients.form.billing_address_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
                  value={formData.billingAddress}
                  onChange={e => setFormData({...formData, billingAddress: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.cif_cui')}</label>
                  <input
                    type="text"
                    placeholder={t('clients.form.cif_placeholder')}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
                    value={formData.billingCif}
                    onChange={e => setFormData({...formData, billingCif: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.reg_no')} <span className="text-neutral-400 font-normal">{t('clients.form.optional')}</span></label>
                  <input
                    type="text"
                    placeholder={t('clients.form.reg_no_placeholder')}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors"
                    value={formData.billingRegNo}
                    onChange={e => setFormData({...formData, billingRegNo: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Team Assignment */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              {t('clients.form.assigned_team') || 'Assigned Therapy Team'}
            </label>
            
            {/* Selected Team Tags */}
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.therapistIds.length === 0 && (
                <span className="text-xs text-neutral-400 italic">No team members assigned yet.</span>
              )}
              {formData.therapistIds.map(tid => {
                const member = teamMembers.find(tm => tm.id === tid);
                if (!member) return null;
                return (
                  <div key={tid} className="flex items-center gap-1.5 px-2 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-lg border border-primary-100 dark:border-primary-800/50 text-xs font-bold">
                    <div className="w-4 h-4 rounded-full bg-primary-500 text-white flex items-center justify-center text-[8px]">
                      {member.initials}
                    </div>
                    {member.name}
                    <button 
                      type="button" 
                      onClick={() => toggleTherapist(tid)}
                      className="p-0.5 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-md transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Selection List */}
            <div className="max-h-40 overflow-y-auto border border-neutral-200 dark:border-neutral-800 rounded-xl divide-y divide-neutral-100 dark:divide-neutral-800">
              {teamMembers.map(tm => {
                const isSelected = formData.therapistIds.includes(tm.id);
                return (
                  <button
                    key={tm.id}
                    type="button"
                    onClick={() => toggleTherapist(tm.id)}
                    className={clsx(
                      "w-full flex items-center justify-between p-2.5 text-sm transition-colors",
                      isSelected 
                        ? "bg-primary-50/50 dark:bg-primary-900/10 text-primary-700 dark:text-primary-300" 
                        : "hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: tm.color || "#ccc" }}
                      >
                        {tm.initials}
                      </div>
                      <div className="text-left">
                        <p className="font-bold leading-none mb-1">{tm.name}</p>
                        <p className="text-[10px] opacity-70">{tm.role}</p>
                      </div>
                    </div>
                    {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4 opacity-30" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Medical Info */}
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('clients.form.medical_info')}</label>
            <textarea
              rows={3}
              placeholder={t('clients.form.medical_info_placeholder')}
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 resize-none transition-colors"
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
              {t('clients.edit_modal.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('clients.edit_modal.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
