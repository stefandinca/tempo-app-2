"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Check, Camera, Phone, Mail, User, Shield, Lock } from "lucide-react";
import { clsx } from "clsx";
import { db, storage } from "@/lib/firebase";
import { doc, setDoc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { TeamMember } from "./TeamMemberCard";
import { createNotificationsBatch } from "@/lib/notificationService";
import { useTranslation } from "react-i18next";

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: TeamMember | null;
}

const ROLES = ["Admin", "Coordinator", "Senior ABA Therapist", "ABA Therapist", "Speech Therapist", "Occupational Therapist"];
const COLORS = ["#4A90E2", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];

export default function TeamMemberModal({ isOpen, onClose, memberToEdit }: TeamMemberModalProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { user: authUser, userRole } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: ROLES[3],
    color: COLORS[0],
    isActive: true,
    baseSalary: "",
    defaultBonus: "",
    photoURL: "",
    password: "" // Admins can set/reset password
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Reset or populate form
  useEffect(() => {
    if (isOpen) {
      if (memberToEdit) {
        setFormData({
          name: memberToEdit.name,
          email: memberToEdit.email,
          phone: memberToEdit.phone || "",
          role: memberToEdit.role,
          color: memberToEdit.color,
          isActive: memberToEdit.isActive !== false,
          baseSalary: (memberToEdit as any).baseSalary || "",
          defaultBonus: (memberToEdit as any).defaultBonus || "",
          photoURL: (memberToEdit as any).photoURL || "",
          password: "" // Masked/Empty for existing
        });
        setAvatarPreview((memberToEdit as any).photoURL || null);
      } else {
        setFormData({
          name: "",
          email: "",
          phone: "",
          role: ROLES[3],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          isActive: true,
          baseSalary: "",
          defaultBonus: "",
          photoURL: "",
          password: ""
        });
        setAvatarPreview(null);
      }
    }
  }, [isOpen, memberToEdit]);

  const isAdmin = userRole === 'Admin';
  const isEditingSelf = authUser?.uid === memberToEdit?.id;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      error("Please select an image file");
      return;
    }

    setIsSubmitting(true);
    try {
      // Use member ID if editing, or a temp path if creating
      const pathId = memberToEdit?.id || `temp_${Date.now()}`;
      const storageRef = ref(storage, `avatars/${pathId}/${file.name}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      setFormData(prev => ({ ...prev, photoURL: url }));
      setAvatarPreview(url);
      success("Avatar uploaded");
    } catch (err) {
      console.error(err);
      error("Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const initials = formData.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const { password, ...otherData } = formData;
      const payload: any = {
        ...otherData,
        baseSalary: parseFloat(formData.baseSalary) || 0,
        defaultBonus: parseFloat(formData.defaultBonus) || 0,
        initials
      };

      // Only add password to payload if it's provided (Admins can reset it)
      // Note: This only updates Firestore. Actual Auth password needs Cloud Function or manual reset.
      if (password) {
        payload.pendingPasswordReset = password;
      }

      let memberId = memberToEdit?.id;

      if (memberToEdit) {
        // Update
        await updateDoc(doc(db, "team_members", memberToEdit.id), payload);
        success("Team member updated");

        // Notify admins if role changed
        if (memberToEdit.role !== formData.role && authUser) {
          const adminQuery = query(collection(db, "team_members"), where("role", "in", ["Admin", "Coordinator"]));
          const adminSnaps = await getDocs(adminQuery);
          const notifications = adminSnaps.docs
            .filter(d => d.id !== authUser.uid)
            .map(d => ({
              recipientId: d.id,
              recipientRole: d.data().role.toLowerCase() as any,
              type: "system_alert" as any,
              category: "team" as any,
              title: "Team Role Updated",
              message: `${formData.name}'s role was changed from ${memberToEdit.role} to ${formData.role}`,
              sourceType: "team" as any,
              sourceId: memberToEdit.id,
              triggeredBy: authUser.uid
            }));
          await createNotificationsBatch(notifications);
        }
      } else {
        // Create
        const newRef = doc(collection(db, "team_members"));
        memberId = newRef.id;
        await setDoc(newRef, payload);
        success("Team member added");

        // Notify admins about new team member
        if (authUser) {
          const adminQuery = query(collection(db, "team_members"), where("role", "in", ["Admin", "Coordinator"]));
          const adminSnaps = await getDocs(adminQuery);
          const notifications = adminSnaps.docs
            .filter(d => d.id !== authUser.uid)
            .map(d => ({
              recipientId: d.id,
              recipientRole: d.data().role.toLowerCase() as any,
              type: "team_member_added" as any,
              category: "team" as any,
              title: "New Team Member",
              message: `${formData.name} joined the team as ${formData.role}`,
              sourceType: "team" as any,
              sourceId: memberId,
              triggeredBy: authUser.uid,
              actions: [{ label: "View Team", type: "navigate" as const, route: "/team" }]
            }));
          await createNotificationsBatch(notifications);
        }
      }
      
      onClose();
    } catch (err) {
      console.error(err);
      error("Failed to save team member");
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {memberToEdit ? t('team.edit_profile') : t('team.add_member')}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Avatar & Basics */}
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="relative group">
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-sm transition-all overflow-hidden border-4 border-white dark:border-neutral-800"
                style={{ backgroundColor: avatarPreview ? 'transparent' : formData.color }}
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  formData.name.split(' ').map(n => n[0]).join('').toUpperCase() || "?"
                )}
              </div>
              <button 
                type="button"
                onClick={handleAvatarClick}
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Camera className="w-5 h-5" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileChange}
              />
            </div>

            <div className="flex-1 space-y-1 w-full text-center sm:text-left">
              <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('settings.profile.avatar_color')}</p>
              <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                {COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({...formData, color: c})}
                    className={clsx(
                      "w-6 h-6 rounded-full transition-all flex items-center justify-center",
                      formData.color === c ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : "hover:scale-105"
                    )}
                    style={{ backgroundColor: c }}
                  >
                    {formData.color === c && <Check className="w-3 h-3 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.full_name')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="text"
                  required
                  className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="email"
                  required
                  className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.phone')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="tel"
                  className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('common.role')}</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <select
                  disabled={!isAdmin && !isEditingSelf}
                  className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input 
                  type="password"
                  autoComplete="new-password"
                  placeholder="********"
                  className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Base Salary (RON)</label>
              <input 
                type="number"
                min="0"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.baseSalary}
                onChange={e => setFormData({...formData, baseSalary: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Monthly Bonus (RON)</label>
              <input 
                type="number"
                min="0"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.defaultBonus}
                onChange={e => setFormData({...formData, defaultBonus: e.target.value})}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isActive"
              checked={formData.isActive}
              onChange={e => setFormData({...formData, isActive: e.target.checked})}
              className="rounded text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('team.active')}</label>
          </div>
        </form>

        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 font-bold transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
