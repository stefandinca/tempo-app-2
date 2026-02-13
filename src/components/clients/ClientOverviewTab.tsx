"use client";

import { Mail, User, ShieldAlert, Calendar, Clock, BarChart, Phone, Cake, FileText, ChevronRight, MessageSquare, Loader2, ClipboardCheck, Building, Plus, X, Users, Check, Search } from "lucide-react";
import Link from "next/link";
import { useTeamMembers, useClientEvents } from "@/hooks/useCollections";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import { notifyClientAssigned } from "@/lib/notificationService";
import { useConfirm } from "@/context/ConfirmContext";

interface ClientOverviewTabProps {
  client: any;
  pendingAction?: string | null;
  onActionHandled?: () => void;
}

export default function ClientOverviewTab({ client, pendingAction, onActionHandled }: ClientOverviewTabProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { user: authUser, userRole } = useAuth();
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { data: teamMembers } = useTeamMembers();
  const { data: events, loading: eventsLoading } = useClientEvents(client.id);
  
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === 'Admin' || userRole === 'Superadmin';
  const isCoordinator = userRole === 'Coordinator';
  const canManageTeam = isAdmin || isCoordinator;

  const assignedIds = client.therapistIds || (client.assignedTherapistId ? [client.assignedTherapistId] : []);
  const assignedTeam = (teamMembers || []).filter(tm => assignedIds.includes(tm.id));
  const availableMembers = (teamMembers || []).filter(tm => 
    !assignedIds.includes(tm.id) && 
    (tm.name.toLowerCase().includes(memberSearch.toLowerCase()) || tm.role.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const parseDate = (val: any) => {
    if (!val) return null;
    return new Date(val);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const handleAddMember = async (member: any) => {
    try {
      const clientRef = doc(db, "clients", client.id);
      await updateDoc(clientRef, {
        therapistIds: arrayUnion(member.id)
      });
      
      if (authUser) {
        notifyClientAssigned(member.id, {
          clientId: client.id,
          clientName: client.name,
          triggeredByUserId: authUser.uid
        }).catch(err => console.error("Failed to notify member:", err));
      }

      success(t('clients.member_assigned', { name: member.name }) || `${member.name} assigned to client`);
      setIsAddingMember(false);
      setMemberSearch("");
    } catch (err) {
      error(t('clients.assign_error') || "Failed to assign member");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    customConfirm({
      title: t('clients.remove_member_title') || "Remove Member",
      message: t('clients.remove_member_confirm') || "Remove this team member from the client?",
      confirmLabel: t('clients.remove_member_action') || "Remove",
      variant: 'danger',
      onConfirm: async () => {
        try {
          const clientRef = doc(db, "clients", client.id);
          await updateDoc(clientRef, {
            therapistIds: arrayRemove(memberId)
          });
          success(t('clients.member_removed') || "Member removed");
        } catch (err) {
          error(t('clients.remove_error') || "Failed to remove member");
        }
      }
    });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAddingMember(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const upcomingEvents = (events || [])
    .filter(e => {
      const d = parseDate(e.startTime);
      return d && d >= new Date();
    })
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
    .slice(0, 3);

  const generateReport = () => {
    window.open(`/reports/client/?id=${client.id}`, '_blank');
  };

  useEffect(() => {
    if (pendingAction === "generate-report" && !eventsLoading) {
      generateReport();
      onActionHandled?.();
    }
  }, [pendingAction, eventsLoading, onActionHandled]);

  const InfoField = ({ label, value, icon: Icon }: any) => (
    <div className="space-y-1">
      <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold">{label}</p>
      <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
        {Icon && <Icon className="w-4 h-4 text-neutral-400 shrink-0" />}
        <span className="font-medium truncate">{value || "—"}</span>
      </div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
      
      <div className="lg:col-span-2 space-y-6">
        
        {/* 1. Personal & Contact Info */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 font-display flex items-center gap-2">
            <User className="w-5 h-5 text-primary-500" />
            {t('clients.personal_info')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <InfoField label={t('clients.fields.full_name')} value={client.name} icon={User} />
            <InfoField label={t('clients.fields.birth_date')} value={formatDate(parseDate(client.birthDate))} icon={Cake} />
            <InfoField label={t('clients.fields.parent_name')} value={client.parentName} icon={User} />
            <InfoField label={t('clients.fields.phone')} value={client.phone} icon={Phone} />
            <InfoField label={t('clients.fields.parent_email')} value={client.parentEmail} icon={Mail} />
          </div>
        </div>

        {/* 2. Assigned Team */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-neutral-900 dark:text-white font-display flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-500" />
              {t('clients.assigned_team')}
            </h3>
            
            {canManageTeam && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setIsAddingMember(!isAddingMember)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-bold hover:bg-primary-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('team.add_member')}
                </button>

                {isAddingMember && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
                        <input 
                          type="text"
                          placeholder={t('team.search_placeholder')}
                          className="w-full pl-7 pr-3 py-1.5 bg-neutral-50 dark:bg-neutral-800 border-none rounded-lg text-xs focus:ring-2 focus:ring-primary-500"
                          value={memberSearch}
                          onChange={(e) => setMemberSearch(e.target.value)}
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-y-auto p-1">
                      {availableMembers.length === 0 ? (
                        <p className="text-[10px] text-neutral-500 text-center py-4 italic">{t('team.no_results')}</p>
                      ) : (
                        availableMembers.map(tm => (
                          <button
                            key={tm.id}
                            onClick={() => handleAddMember(tm)}
                            className="w-full flex items-center gap-3 p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800 rounded-lg transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-sm" style={{ backgroundColor: tm.color }}>
                              {tm.initials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">{tm.name}</p>
                              <p className="text-[10px] text-neutral-500 truncate">{tm.role}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {assignedTeam.length > 0 ? (
              assignedTeam.map(tm => (
                <div 
                  key={tm.id}
                  className="flex items-center justify-between p-3 border border-neutral-100 dark:border-neutral-800 rounded-xl group hover:border-primary-200 dark:hover:border-primary-900/50 transition-colors"
                >
                  <Link href="/team/" className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                      style={{ backgroundColor: tm.color }}
                    >
                      {tm.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-neutral-900 dark:text-white text-sm truncate group-hover:text-primary-600 transition-colors">{tm.name}</p>
                      <p className="text-xs text-neutral-500 truncate">{tm.role}</p>
                    </div>
                  </Link>
                  {canManageTeam && (
                    <button 
                      onClick={() => handleRemoveMember(tm.id)}
                      className="p-1.5 text-neutral-300 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      title="Remove from client"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500 italic col-span-2 py-4 text-center">{t('clients.no_team_assigned') || 'No team members assigned yet.'}</p>
            )}
          </div>
        </div>

        {/* 3. Clinical Information */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 font-display flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-success-500" />
            {t('clients.medical_notes')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
            <div className="sm:col-span-2">
              <InfoField label={t('clients.fields.diagnosis')} value={client.primaryDiagnosis} icon={ShieldAlert} />
            </div>
            <InfoField label={t('clients.fields.diagnosis_date')} value={formatDate(parseDate(client.diagnosisDate))} icon={Calendar} />
            <InfoField label={t('clients.fields.support_level')} value={client.diagnosisLevel ? `Level ${client.diagnosisLevel}` : "—"} icon={BarChart} />
          </div>
          
          <div className="mt-8 pt-6 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest font-bold mb-3">{t('clients.fields.medical_info')}</p>
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed italic">
                {client.medicalInfo ? `"${client.medicalInfo}"` : t('clients.no_medical_info') || "No medical alerts or clinical notes provided."}
              </p>
            </div>
          </div>
        </div>

        {/* 4. Billing Information */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 font-display flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-500" />
            {t('clients.billing_info') || 'Billing Information'}
          </h3>
          <div className="space-y-6">
            <InfoField label={t('clients.fields.billing_address')} value={client.billingAddress} icon={Building} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <InfoField label={t('clients.fields.cif_cui')} value={client.billingCif} icon={FileText} />
              <InfoField label={t('clients.fields.reg_no')} value={client.billingRegNo} icon={FileText} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Actions & Schedule */}
      <div className="space-y-6">
        
        {/* Report Generation */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4 font-display">{t('clients.clinical_actions')}</h3>
          <button
            onClick={generateReport}
            disabled={eventsLoading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            {t('reports.team.generate')}
          </button>
          <p className="text-[10px] text-neutral-400 mt-3 text-center leading-relaxed">
            {t('clients.report_description') || 'Compiles a professional HTML report including session history, attendance, and evaluation achievement.'}
          </p>
        </div>

        {/* Upcoming Schedule */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4 flex items-center gap-2 font-display">
            <Calendar className="w-4 h-4 text-primary-500" />
            {t('clients.upcoming_schedule')}
          </h3>
          
          {eventsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
            </div>
          ) : upcomingEvents.length > 0 ? (
            <div className="space-y-3">
              {upcomingEvents.map((evt: any) => {
                const startDate = parseDate(evt.startTime);
                const isToday = startDate?.toDateString() === new Date().toDateString();
                
                return (
                  <div key={evt.id} className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl border border-primary-100 dark:border-primary-900/50">
                    <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider">
                      {isToday ? t('calendar.today') : startDate?.toLocaleDateString(undefined, { weekday: 'long' })}
                    </p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">{evt.type}</p>
                    <p className="text-xs text-neutral-500">
                      {startDate?.toLocaleTimeString(i18n.language || 'ro', { hour: '2-digit', minute: '2-digit' })} - {evt.duration} min
                    </p>
                  </div>
                );
              })}
              <Link 
                href="/calendar/" 
                className="block text-center py-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                {t('dashboard.schedule.view_all')}
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500 italic">{t('clients.no_upcoming')}</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
