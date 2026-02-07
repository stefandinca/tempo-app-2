"use client";

import { Mail, User, ShieldAlert, Calendar, Clock, BarChart, Phone, Cake, FileText, ChevronRight, MessageSquare, Loader2, ClipboardCheck, Building } from "lucide-react";
import Link from "next/link";
import { useTeamMembers, useClientEvents } from "@/hooks/useCollections";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

interface ClientOverviewTabProps {
  client: any;
  pendingAction?: string | null;
  onActionHandled?: () => void;
}

export default function ClientOverviewTab({ client, pendingAction, onActionHandled }: ClientOverviewTabProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { data: teamMembers } = useTeamMembers();
  const { data: events, loading: eventsLoading } = useClientEvents(client.id);
  
  const therapist = (teamMembers || []).find(t => t.id === client.assignedTherapistId);

  const parseDate = (val: any) => {
    if (!val) return null;
    return new Date(val);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "—";
    return date.toLocaleDateString('ro-RO', { day: '2-digit', month: 'long', year: 'numeric' });
  };

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

        {/* 2. Clinical Information */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 font-display flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-success-500" />
            Clinical Information
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
                {client.medicalInfo ? `"${client.medicalInfo}"` : "No medical alerts or clinical notes provided."}
              </p>
            </div>
          </div>
        </div>

        {/* 3. Billing Information */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-6 font-display flex items-center gap-2">
            <Building className="w-5 h-5 text-amber-500" />
            Billing Information
          </h3>
          <div className="space-y-6">
            <InfoField label={t('clients.fields.billing_address')} value={client.billingAddress} icon={Building} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
              <InfoField label={t('clients.fields.cif_cui')} value={client.billingCif} icon={FileText} />
              <InfoField label={t('clients.fields.reg_no')} value={client.billingRegNo} icon={FileText} />
            </div>
          </div>
        </div>

        {/* 4. Assigned Team */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-neutral-900 dark:text-white mb-4 font-display">{t('clients.assigned_team')}</h3>
          {therapist ? (
            <Link 
              href="/team/"
              className="flex items-center gap-4 p-3 border border-neutral-100 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors w-fit pr-8 group"
            >
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: therapist.color }}
              >
                {therapist.initials}
              </div>
              <div>
                <p className="font-bold text-neutral-900 dark:text-white group-hover:text-primary-600 transition-colors">{therapist.name}</p>
                <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{therapist.role}</p>
              </div>
            </Link>
          ) : (
            <p className="text-sm text-neutral-500 italic">No therapist assigned yet.</p>
          )}
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
            Generate Full Report
          </button>
          <p className="text-[10px] text-neutral-400 mt-3 text-center leading-relaxed">
            Compiles a professional HTML report including session history, attendance, and evaluation achievement.
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
                      {isToday ? "Today" : startDate?.toLocaleDateString('ro-RO', { weekday: 'long' })}
                    </p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white mt-1">{evt.type}</p>
                    <p className="text-xs text-neutral-500">
                      {startDate?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {evt.duration} min
                    </p>
                  </div>
                );
              })}
              <Link 
                href="/calendar/" 
                className="block text-center py-2 text-sm font-bold text-primary-600 dark:text-primary-400 hover:underline"
              >
                View full calendar
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-neutral-500 italic">No upcoming sessions found.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
