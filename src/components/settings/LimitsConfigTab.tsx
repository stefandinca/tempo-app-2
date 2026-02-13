"use client";

import { useState, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { Loader2, Save, ShieldAlert, Users, UserCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function LimitsConfigTab() {
  const { t } = useTranslation();
  const { clients, teamMembers, systemSettings: settings } = useData();
  const { success, error } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const [maxActiveClients, setMaxActiveClients] = useState(0);
  const [maxActiveTeamMembers, setMaxActiveTeamMembers] = useState(0);

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setMaxActiveClients(settings.maxActiveClients || 0);
      setMaxActiveTeamMembers(settings.maxActiveTeamMembers || 0);
    }
  }, [settings]);

  // Current usage counts
  const activeClientsCount = clients.data.filter((c: any) => !c.isArchived).length;
  const activeTeamCount = teamMembers.data.filter((m: any) => m.role !== 'Superadmin' && m.isActive !== false).length;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, "system_settings", "config"), {
        maxActiveClients,
        maxActiveTeamMembers,
      }, { merge: true });
      success(t('settings.limits.save_success'));
    } catch (err) {
      console.error(err);
      error(t('settings.limits.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (clients.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
          <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('settings.limits.title')}</h3>
          <p className="text-sm text-neutral-500">{t('settings.limits.subtitle')}</p>
        </div>
      </div>

      {/* Limits Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Max Active Clients */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <Users className="w-4 h-4 text-primary-500" />
            {t('settings.limits.max_clients')}
          </label>
          <input
            type="number"
            min="0"
            value={maxActiveClients}
            onChange={e => setMaxActiveClients(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
          />
          <p className="text-xs text-neutral-400">{t('settings.limits.max_clients_hint')}</p>
        </div>

        {/* Max Active Team Members */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">
            <UserCheck className="w-4 h-4 text-primary-500" />
            {t('settings.limits.max_team_members')}
          </label>
          <input
            type="number"
            min="0"
            value={maxActiveTeamMembers}
            onChange={e => setMaxActiveTeamMembers(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
          />
          <p className="text-xs text-neutral-400">{t('settings.limits.max_team_members_hint')}</p>
        </div>
      </div>

      {/* Current Usage */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">{t('settings.limits.current_usage')}</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
            <Users className="w-5 h-5 text-primary-500" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {maxActiveClients > 0
                ? t('settings.limits.clients_usage', { current: activeClientsCount, max: maxActiveClients })
                : t('settings.limits.clients_usage_unlimited', { current: activeClientsCount })
              }
            </span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
            <UserCheck className="w-5 h-5 text-primary-500" />
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {maxActiveTeamMembers > 0
                ? t('settings.limits.team_usage', { current: activeTeamCount, max: maxActiveTeamMembers })
                : t('settings.limits.team_usage_unlimited', { current: activeTeamCount })
              }
            </span>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t('common.save')}
        </button>
      </div>
    </div>
  );
}
