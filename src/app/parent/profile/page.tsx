"use client";

import { useMemo, useState } from "react";
import { User, Calendar, Heart, Clipboard, MessageSquare, FileText, ChevronRight, Bell, Globe, LogOut, Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers, useInterventionPlans } from "@/hooks/useCollections";
import { useNotifications } from "@/context/NotificationContext";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function ParentProfilePage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: client, loading, error } = usePortalData();
  const { data: team } = useTeamMembers();
  const { activePlan } = useInterventionPlans(client?.id || "");
  const { requestPushPermission, pushPermissionStatus, pushError } = useNotifications();
  const [isChangingLang, setIsChangingLang] = useState(false);

  // Calculate age
  const age = useMemo(() => {
    if (!client?.birthDate) return null;
    const birth = new Date(client.birthDate);
    const now = new Date();
    let a = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) a--;
    return a;
  }, [client?.birthDate]);

  // Get assigned therapists
  const assignedTeam = useMemo(() => {
    if (!client?.therapistIds && !client?.therapistId) return [];
    const ids = client.therapistIds || (client.therapistId ? [client.therapistId] : []);
    return ids.map((id: string) => (team || []).find((t) => t.id === id)).filter(Boolean);
  }, [client, team]);

  const handleSignOut = async () => {
    sessionStorage.removeItem("parent_client_code");
    sessionStorage.removeItem("parent_client_id");
    sessionStorage.removeItem("parent_client_name");
    sessionStorage.removeItem("parent_uid");
    await firebaseSignOut(auth);
    router.push("/parent/");
  };

  const changeLanguage = (lng: string) => {
    setIsChangingLang(true);
    i18n.changeLanguage(lng);
    setTimeout(() => setIsChangingLang(false), 500);
  };

  if (loading) return <PortalLoading />;
  if (error || !client) return <PortalError message={error || t("parent_portal.dashboard.load_error")} />;

  const initial = client.name ? client.name.charAt(0).toUpperCase() : "?";

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-300 pb-24">
      {/* Profile Header */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5 text-center">
        <div className="w-20 h-20 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-white font-bold text-3xl">{initial}</span>
        </div>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{client.name}</h1>
        {age !== null && (
          <p className="text-sm text-neutral-400 mt-0.5">{t("parent_portal.profile.age", { count: age })}</p>
        )}
        {client.diagnosis && (
          <p className="text-xs text-neutral-500 mt-1 bg-neutral-50 dark:bg-neutral-800 px-3 py-1 rounded-full inline-block">
            {client.diagnosis}
          </p>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 gap-3">
        {client.startDate && (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
            <Calendar className="w-5 h-5 text-primary-500 mb-2" />
            <p className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
              {t("parent_portal.profile.start_date")}
            </p>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">
              {new Date(client.startDate).toLocaleDateString(currentLang, { month: "short", year: "numeric" })}
            </p>
          </div>
        )}

        {client.supportLevel && (
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
            <Heart className="w-5 h-5 text-error-500 mb-2" />
            <p className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
              {t("parent_portal.profile.support_level")}
            </p>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white mt-0.5">{client.supportLevel}</p>
          </div>
        )}

        <div className="col-span-2 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4">
          <Clipboard className="w-5 h-5 text-purple-500 mb-2" />
          <p className="text-[10px] text-neutral-400 uppercase font-semibold tracking-wider">
            {t("parent_portal.profile.intervention_plan")}
          </p>
          {activePlan ? (
            <div className="mt-1">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">{activePlan.name}</p>
              <p className="text-xs text-neutral-400">
                {new Date(activePlan.startDate).toLocaleDateString(currentLang)} — {new Date(activePlan.endDate).toLocaleDateString(currentLang)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-400 mt-1">{t("parent_portal.profile.no_plan")}</p>
          )}
        </div>
      </div>

      {/* Portal Settings Section */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">
          {t("parent_portal.profile.portal_settings") || "Portal Settings"}
        </h2>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800">
          
          {/* Push Notifications Toggle */}
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Push Notifications</p>
                <p className="text-[10px] text-neutral-400">Receive alerts when app is closed</p>
              </div>
            </div>
            <button 
              onClick={requestPushPermission}
              disabled={pushPermissionStatus === 'granted'}
              className={clsx(
                "w-12 h-6 rounded-full transition-colors relative flex-shrink-0",
                pushPermissionStatus === 'granted' ? "bg-primary-500" : "bg-neutral-300 dark:bg-neutral-700"
              )}
            >
              <div className={clsx(
                "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                pushPermissionStatus === 'granted' ? "translate-x-6" : "translate-x-0"
              )} />
            </button>
          </div>

          {/* Language Selector */}
          <div className="p-4">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 flex items-center justify-center text-secondary-500">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t("settings.appearance.language")}</p>
                </div>
             </div>
             <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'ro', label: 'Română', flag: '🇷🇴' },
                  { id: 'en', label: 'English', flag: '🇺🇸' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => changeLanguage(lang.id)}
                    className={clsx(
                      "px-3 py-2 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-all",
                      i18n.language.startsWith(lang.id)
                        ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300" 
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    )}
                  >
                    <span>{lang.flag}</span>
                    <span>{lang.label}</span>
                    {i18n.language.startsWith(lang.id) && <Check className="w-3 h-3" />}
                  </button>
                ))}
             </div>
          </div>
        </div>
      </section>

      {/* Therapy Team */}
      {assignedTeam.length > 0 && (
        <section className="space-y-3 pt-2">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-widest px-1">
            {t("parent_portal.profile.therapy_team")}
          </h2>
          <div className="space-y-2">
            {assignedTeam.map((therapist: any) => (
              <div
                key={therapist.id}
                className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: therapist.color || "#6366f1" }}
                >
                  {therapist.initials || "??"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">{therapist.name}</p>
                  <p className="text-xs text-neutral-400">{therapist.role || therapist.specialty}</p>
                </div>
                <Link
                  href={`/parent/messages/?therapistId=${therapist.id}`}
                  className="px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  {t("parent_portal.profile.message_therapist")}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Documents shortcut */}
      <Link
        href="/parent/docs/"
        className="flex items-center gap-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-4 hover:shadow transition-shadow group"
      >
        <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center text-primary-500">
          <FileText className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white">{t("parent_portal.profile.documents")}</p>
          <p className="text-xs text-neutral-400">{t("parent_portal.profile.view_documents")}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-neutral-300 group-hover:translate-x-0.5 transition-transform" />
      </Link>

      {/* Logout Button */}
      <div className="pt-4">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-3 p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-error-600 font-bold shadow-sm active:scale-[0.98] transition-all"
        >
          <LogOut className="w-5 h-5" />
          {t("nav.sign_out")}
        </button>
      </div>
    </div>
  );
}
