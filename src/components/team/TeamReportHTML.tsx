"use client";

import { useTranslation } from "react-i18next";
import { 
  User, 
  Calendar, 
  Clock, 
  Printer, 
  ChevronLeft,
  Briefcase,
  Users,
  BarChart3,
  ListFilter,
  CheckCircle2,
  Phone,
  Mail,
  Zap
} from "lucide-react";
import { clsx } from "clsx";

interface TeamReportHTMLProps {
  member: any;
  events: any[];
  clients: any[];
  services: any[];
  clinic: any;
  onBack: () => void;
}

export default function TeamReportHTML({
  member,
  events,
  clients,
  services,
  clinic,
  onBack
}: TeamReportHTMLProps) {
  const { t } = useTranslation();

  // --- Data Processing & Aggregations ---

  const totalSessions = events.length;
  const totalHours = events.reduce((sum, evt) => sum + (evt.duration || 60), 0) / 60;
  
  // Unique Clients
  const assignedClientsCount = new Set(events.map(e => e.clientId).filter(Boolean)).size;

  // Breakdown by Client
  const clientBreakdown = events.reduce((acc: any, evt) => {
    const clientId = evt.clientId;
    if (!clientId) return acc;
    const clientName = clients.find(c => c.id === clientId)?.name || t('reports.defaults.unknown_client');
    
    if (!acc[clientId]) {
      acc[clientId] = { name: clientName, count: 0, hours: 0 };
    }
    acc[clientId].count++;
    acc[clientId].hours += (evt.duration || 60) / 60;
    return acc;
  }, {});

  // Breakdown by Service
  const serviceBreakdown = events.reduce((acc: any, evt) => {
    const serviceId = evt.type;
    const serviceLabel = services.find(s => s.id === serviceId)?.label || serviceId || t('reports.defaults.standard_session');
    
    if (!acc[serviceId]) {
      acc[serviceId] = { label: serviceLabel, count: 0, hours: 0 };
    }
    acc[serviceId].count++;
    acc[serviceId].hours += (evt.duration || 60) / 60;
    return acc;
  }, {});

  const handlePrint = () => {
    window.print();
  };

  const clean = (txt: string) => txt || "—";

  return (
    <div className="min-h-screen bg-neutral-100 dark:bg-neutral-950 p-4 sm:p-8 print:bg-white print:p-0">
      
      {/* Action Bar */}
      <div className="max-w-5xl mx-auto mb-6 flex items-center justify-between print:hidden font-display">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 transition-all shadow-sm font-medium"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </button>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl shadow-lg shadow-primary-600/20 transition-all font-bold"
        >
          <Printer className="w-4 h-4" />
          {t('billing_page.export')}
        </button>
      </div>

      {/* Main Report Page */}
      <div className="max-w-5xl mx-auto bg-white dark:bg-neutral-900 shadow-2xl print:shadow-none print:w-full min-h-[29.7cm] border border-neutral-200 dark:border-neutral-800 p-12 lg:p-16">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-primary-500 pb-10 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold font-display shadow-lg shadow-primary-500/20">
                T
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white font-display tracking-tight leading-none">{t('header.titles.app_title')}</h1>
                <p className="text-sm text-neutral-500 font-medium">{t('reports.client.system_subtitle')}</p>
              </div>
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-neutral-900 dark:text-white font-display uppercase tracking-tight">{t('reports.team.title')}</h2>
              <p className="text-neutral-500">{t('reports.client.generated_on')}: {new Date().toLocaleDateString('ro-RO', { dateStyle: 'long' })}</p>
            </div>
          </div>

          <div className="text-right space-y-1 text-sm text-neutral-600 dark:text-neutral-400">
            <p className="font-bold text-neutral-900 dark:text-white">{clinic?.name || t('reports.defaults.clinic_name')}</p>
            <p>{clinic?.address || t('reports.defaults.clinic_address')}</p>
            <p>CUI: {clinic?.cui || "RO12345678"}</p>
            <p>{clinic?.email || t('reports.defaults.contact_email')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Section: Member Info */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <Briefcase className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('reports.team.profile')}</h3>
            </div>
            <div className="flex items-center gap-5">
              <div 
                className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl shadow-lg"
                style={{ backgroundColor: member.color || "#4A90E2" }}
              >
                {member.initials}
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{member.name}</p>
                <p className="text-primary-600 font-bold uppercase tracking-widest text-xs">{member.role}</p>
                <div className="flex flex-col mt-2 space-y-1">
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <Mail className="w-3.5 h-3.5" />
                    <span>{member.email}</span>
                  </div>
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm text-neutral-500">
                      <Phone className="w-3.5 h-3.5" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: Activity Summary */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <Zap className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('reports.team.kpis')}</h3>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-primary-50 dark:bg-primary-900/10 border border-primary-100 dark:border-primary-900/30 rounded-2xl text-center">
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">{totalSessions}</p>
                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mt-1">{t('reports.team.sessions')}</p>
              </div>
              <div className="p-4 bg-success-50 dark:bg-success-900/10 border border-success-100 dark:border-success-900/30 rounded-2xl text-center">
                <p className="text-2xl font-bold text-success-700 dark:text-success-400">{assignedClientsCount}</p>
                <p className="text-[10px] font-bold text-success-600 uppercase tracking-widest mt-1">{t('reports.team.clients')}</p>
              </div>
              <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:bg-amber-900/30 rounded-2xl text-center">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{totalHours.toFixed(1)}h</p>
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mt-1">{t('reports.team.hours')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          {/* Section: Client Breakdown */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <Users className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('reports.team.distribution_by_client')}</h3>
            </div>
            <div className="space-y-3">
              {Object.values(clientBreakdown).map((item: any) => (
                <div key={item.name} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-primary-600">
                      {item.count} {t('reports.client.sessions_label')}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">
                      {item.hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))}
              {totalSessions === 0 && <p className="text-sm text-neutral-500 italic">{t('reports.client.no_activity')}</p>}
            </div>
          </div>

          {/* Section: Service Breakdown */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
              <BarChart3 className="w-5 h-5 text-primary-500" />
              <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('reports.team.services_provided')}</h3>
            </div>
            <div className="space-y-3">
              {Object.values(serviceBreakdown).map((item: any) => (
                <div key={item.label} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/50 p-3 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white dark:bg-neutral-900 rounded-md border border-neutral-200 dark:border-neutral-700 text-[10px] font-bold text-success-600">
                      {item.count} {t('reports.client.sessions_label')}
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400">
                      {item.hours.toFixed(1)}h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section: Detailed Session Log */}
        <div className="space-y-6 mb-12">
          <div className="flex items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-2">
            <ListFilter className="w-5 h-5 text-primary-500" />
            <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-wider text-sm">{t('reports.team.session_log')}</h3>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-display">
                <tr>
                  <th className="px-6 py-4">{t('calendar.event.date')}</th>
                  <th className="px-6 py-4">{t('calendar.event.client')}</th>
                  <th className="px-6 py-4">{t('calendar.event.type')}</th>
                  <th className="px-6 py-4 text-right">{t('calendar.event.duration')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {events.map((evt) => {
                  const clientName = clients.find(c => c.id === evt.clientId)?.name || t('reports.defaults.unknown_client');
                  const serviceLabel = services.find(s => s.id === evt.type)?.label || evt.type || t('reports.defaults.therapy');
                  const date = new Date(evt.startTime).toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' });
                  
                  return (
                    <tr key={evt.id} className="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/30 transition-colors">
                      <td className="px-6 py-4 font-medium text-neutral-600 dark:text-neutral-400 tabular-nums">{date}</td>
                      <td className="px-6 py-4 font-bold text-neutral-900 dark:text-white">{clientName}</td>
                      <td className="px-6 py-4 font-medium text-neutral-700 dark:text-neutral-300">{serviceLabel}</td>
                      <td className="px-6 py-4 text-right font-bold text-primary-600 tabular-nums">{evt.duration || 60} min</td>
                    </tr>
                  );
                })}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic">{t('reports.client.no_activity')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Report Footer */}
        <div className="mt-20 pt-10 border-t border-neutral-100 dark:border-neutral-800 text-center space-y-4">
          <div className="flex justify-center gap-12 text-sm font-medium text-neutral-600 dark:text-neutral-400 mb-10">
            <div className="space-y-8">
              <div className="w-48 border-b border-neutral-300 dark:border-neutral-700 h-12" />
              <p>{t('reports.team.member_signature')}</p>
            </div>
            <div className="space-y-8">
              <div className="w-48 border-b border-neutral-300 dark:border-neutral-700 h-12" />
              <p>{t('reports.team.director_approval')}</p>
            </div>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed max-w-2xl mx-auto italic">
            {t('reports.team.confidentiality_notice')}
          </p>
        </div>

      </div>
    </div>
  );
}