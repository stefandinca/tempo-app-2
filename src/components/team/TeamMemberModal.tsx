"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2, Check, Camera, Phone, Mail, User, Shield, KeyRound, Clock } from "lucide-react";
import { clsx } from "clsx";
import { db, storage, auth as firebaseAuth } from "@/lib/firebase";
import { doc, updateDoc, collection, getDocs, query, where } from "firebase/firestore";
import { callFunction } from "@/lib/callFunction";
import { sendPasswordResetEmail } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { TeamMember } from "./TeamMemberCard";
import { createNotificationsBatch } from "@/lib/notificationService";
import { logActivity } from "@/lib/activityService";
import { useTranslation } from "react-i18next";
import { useData } from "@/context/DataContext";
import { useConfirm } from "@/context/ConfirmContext";

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: TeamMember | null;
}

const ROLE_OPTIONS = [
  { label: "Admin", role: "Admin", specialty: "" },
  { label: "Coordinator", role: "Coordinator", specialty: "" },
  { label: "Senior ABA Therapist", role: "Therapist", specialty: "Senior ABA Therapist" },
  { label: "ABA Therapist", role: "Therapist", specialty: "ABA Therapist" },
  { label: "Speech Therapist", role: "Therapist", specialty: "Speech Therapist" },
  { label: "Occupational Therapist", role: "Therapist", specialty: "Occupational Therapist" },
];
const COLORS = ["#4A90E2", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];

export default function TeamMemberModal({ isOpen, onClose, memberToEdit }: TeamMemberModalProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { user: authUser, userData, userRole } = useAuth();
  const { teamMembers: teamMembersData, systemSettings } = useData();
  const { confirm } = useConfirm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    roleLabel: ROLE_OPTIONS[3].label, // Display label for dropdown
    color: COLORS[0],
    isActive: true,
    baseSalary: "",
    defaultBonus: "",
    photoURL: "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  // Helper: resolve the dropdown label from a member's stored role + specialty
  const resolveRoleLabel = (member: TeamMember): string => {
    const m = member as any;
    // New format: specialty field exists
    if (m.specialty) {
      const match = ROLE_OPTIONS.find(o => o.specialty === m.specialty);
      if (match) return match.label;
    }
    // Old format or exact match: role is the full label (e.g. "ABA Therapist")
    const matchByRole = ROLE_OPTIONS.find(o => o.label === member.role);
    if (matchByRole) return matchByRole.label;
    // Fallback: find by base role
    const matchByBase = ROLE_OPTIONS.find(o => o.role === member.role);
    return matchByBase?.label || ROLE_OPTIONS[3].label;
  };

  // Reset or populate form
  useEffect(() => {
    if (isOpen) {
      if (memberToEdit) {
        setFormData({
          name: memberToEdit.name,
          email: memberToEdit.email,
          phone: memberToEdit.phone || "",
          roleLabel: resolveRoleLabel(memberToEdit),
          color: memberToEdit.color,
          isActive: memberToEdit.isActive !== false,
          baseSalary: (memberToEdit as any).baseSalary || "",
          defaultBonus: (memberToEdit as any).defaultBonus || "",
          photoURL: (memberToEdit as any).photoURL || "",
        });
        setAvatarPreview((memberToEdit as any).photoURL || null);
      } else {
        setFormData({
          name: "",
          email: "",
          phone: "",
          roleLabel: ROLE_OPTIONS[3].label,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          isActive: true,
          baseSalary: "",
          defaultBonus: "",
          photoURL: "",
        });
        setAvatarPreview(null);
      }
    }
  }, [isOpen, memberToEdit]);

  const isAdmin = userRole === 'Admin' || userRole === 'Superadmin';
  const isEditingSelf = authUser?.uid === memberToEdit?.id;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      error(t('team.error_image_type'));
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
      success(t('team.avatar_uploaded'));
    } catch (err) {
      console.error(err);
      error(t('team.upload_failed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!memberToEdit?.email) return;
    setIsSendingReset(true);
    try {
      await sendPasswordResetEmail(firebaseAuth, memberToEdit.email);
      success(t('team.reset_email_sent'));
    } catch (err) {
      console.error(err);
      error(t('team.reset_email_failed'));
    } finally {
      setIsSendingReset(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Check team member limit when creating new active member or reactivating an existing one
    const willBeActive = formData.isActive;
    const wasActive = memberToEdit ? (memberToEdit.isActive !== false) : false;

    if (willBeActive && !wasActive) {
      const maxTeam = systemSettings?.maxActiveTeamMembers || 0;
      if (maxTeam > 0) {
        const activeCount = teamMembersData.data.filter((m: any) => m.role !== 'Superadmin' && m.isActive !== false).length;
        if (activeCount >= maxTeam) {
          setIsSubmitting(false);
          confirm({
            title: t('limits.team_limit_reached_title'),
            message: t('limits.team_limit_reached_message', { max: maxTeam }),
            confirmLabel: 'OK',
            variant: 'warning',
            onConfirm: () => {},
          });
          return;
        }
      }
    }

    try {
      const initials = formData.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      // Resolve dropdown label to base role + specialty
      const selectedOption = ROLE_OPTIONS.find(o => o.label === formData.roleLabel) || ROLE_OPTIONS[3];
      const baseRole = selectedOption.role;
      const specialty = selectedOption.specialty;

      if (memberToEdit) {
        // === UPDATE existing member ===
        const payload: any = {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: baseRole,
          specialty,
          color: formData.color,
          isActive: formData.isActive,
          baseSalary: parseFloat(formData.baseSalary as string) || 0,
          defaultBonus: parseFloat(formData.defaultBonus as string) || 0,
          photoURL: formData.photoURL,
          initials
        };

        await updateDoc(doc(db, "team_members", memberToEdit.id), payload);
        success(t('team.member_updated'));

        // Log activity for team member update
        if (authUser && userData) {
          try {
            await logActivity({
              type: 'team_member_updated',
              userId: authUser.uid,
              userName: userData.name || authUser.email || 'Unknown',
              userPhotoURL: userData.photoURL || authUser.photoURL || undefined,
              targetId: memberToEdit.id,
              targetName: formData.name
            });
          } catch (activityError) {
            console.error('Failed to log activity:', activityError);
          }
        }

        // Notify admins if role changed
        if (resolveRoleLabel(memberToEdit) !== formData.roleLabel && authUser) {
          const adminQuery = query(collection(db, "team_members"), where("role", "in", ["Admin", "Coordinator"]));
          const adminSnaps = await getDocs(adminQuery);
          const notifications = adminSnaps.docs
            .filter(d => d.id !== authUser.uid)
            .map(d => ({
              recipientId: d.id,
              recipientRole: d.data().role.toLowerCase() as any,
              type: "system_alert" as any,
              category: "team" as any,
              title: t('team.notification_role_updated'),
              message: t('team.notification_role_changed', { name: formData.name, oldRole: resolveRoleLabel(memberToEdit), newRole: formData.roleLabel }),
              sourceType: "team" as any,
              sourceId: memberToEdit.id,
              triggeredBy: authUser.uid
            }));
          await createNotificationsBatch(notifications);
        }
      } else {
        // === CREATE new member via Cloud Function ===
        const result = await callFunction<{ uid: string }>("createTeamMember", {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: baseRole,
          specialty,
          color: formData.color,
          initials,
          isActive: formData.isActive,
          baseSalary: parseFloat(formData.baseSalary as string) || 0,
          defaultBonus: parseFloat(formData.defaultBonus as string) || 0,
          photoURL: formData.photoURL,
        });

        const memberId = result.uid;

        // Send password reset email (acts as invitation email)
        try {
          await sendPasswordResetEmail(firebaseAuth, formData.email);
        } catch (emailErr) {
          console.error("Failed to send invitation email:", emailErr);
          // Don't fail the whole operation — member was created
        }

        success(t('team.member_added_invite_sent'));

        // Log activity for team member creation
        if (authUser && userData) {
          try {
            await logActivity({
              type: 'team_member_created',
              userId: authUser.uid,
              userName: userData.name || authUser.email || 'Unknown',
              userPhotoURL: userData.photoURL || authUser.photoURL || undefined,
              targetId: memberId,
              targetName: formData.name
            });
          } catch (activityError) {
            console.error('Failed to log activity:', activityError);
          }
        }

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
              title: t('team.notification_new_member'),
              message: t('team.notification_member_joined', { name: formData.name, role: formData.roleLabel }),
              sourceType: "team" as any,
              sourceId: memberId,
              triggeredBy: authUser.uid,
              actions: [{ label: "View Team", type: "navigate" as const, route: "/team" }]
            }));
          await createNotificationsBatch(notifications);
        }
      }

      onClose();
    } catch (err: any) {
      console.error(err);
      // Handle specific Cloud Function errors
      if (err?.code === "functions/already-exists") {
        error(t('team.email_already_exists'));
      } else {
        error(memberToEdit ? t('team.save_failed') : t('team.create_failed'));
      }
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

          {/* Invite Status Badge (Edit Mode) */}
          {memberToEdit?.inviteStatus === "pending" && (
            <div className="flex items-center gap-2 px-3 py-2 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl">
              <Clock className="w-4 h-4 text-warning-500" />
              <span className="text-sm font-medium text-warning-700 dark:text-warning-400">
                {t('team.invite_status_pending')}
              </span>
            </div>
          )}

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
                  disabled={!!memberToEdit}
                  className="w-full pl-10 pr-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-60 disabled:cursor-not-allowed"
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
                  value={formData.roleLabel}
                  onChange={e => setFormData({...formData, roleLabel: e.target.value})}
                >
                  {ROLE_OPTIONS.map(r => <option key={r.label} value={r.label}>{t(`team.roles.${r.label}`, r.label)}</option>)}
                </select>
              </div>
            </div>

            {/* Send Password Reset Email (Edit mode only, Admin only) */}
            {memberToEdit && isAdmin && (
              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.password')}</label>
                <button
                  type="button"
                  onClick={handleSendResetEmail}
                  disabled={isSendingReset}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm font-medium text-neutral-700 dark:text-neutral-300 transition-colors disabled:opacity-50"
                >
                  {isSendingReset ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-neutral-400" />
                  )}
                  {t('team.send_reset_email')}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('team.base_salary')}</label>
              <input
                type="number"
                min="0"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.baseSalary}
                onChange={e => setFormData({...formData, baseSalary: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('team.monthly_bonus')}</label>
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
