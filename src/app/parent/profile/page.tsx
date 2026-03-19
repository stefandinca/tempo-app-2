"use client";

import { useMemo, useState } from "react";
import { Calendar, Heart, CreditCard, FileText, BookOpen, ChevronRight, Bell, Globe, LogOut, Check } from "lucide-react";
import Link from "next/link";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers, useClientInvoices, useHomework } from "@/hooks/useCollections";
import { useNotifications } from "@/context/NotificationContext";
import { useParentAuth } from "@/context/ParentAuthContext";
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
  const { clientId } = useParentAuth();
  const { requestPushPermission, pushPermissionStatus } = useNotifications();
  const { data: invoices } = useClientInvoices(client?.id || "");
  const { data: homework } = useHomework(clientId || "");
  const [isChangingLang, setIsChangingLang] = useState(false);

  const unpaidInvoiceCount = useMemo(() =>
    invoices.filter(i => i.status === 'pending' || i.status === 'create' || i.status === 'issued' || i.status === 'overdue').length,
  [invoices]);

  const incompleteHomeworkCount = useMemo(() =>
    homework.filter(h => !h.completed).length,
  [homework]);

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
    <div className="p-4 space-y-5 animate-in fade-in duration-300 pb-20">
      {/* Child Header — Compact */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm p-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl">{initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 dark:text-white truncate">{client.name}</h1>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {age !== null && (
                <span className="text-sm text-neutral-500">{t("parent_portal.profile.age", { count: age })}</span>
              )}
              {age !== null && client.diagnosis && (
                <span className="text-neutral-300 dark:text-neutral-600">&middot;</span>
              )}
              {client.diagnosis && (
                <span className="text-xs text-neutral-500 bg-neutral-50 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
                  {client.diagnosis}
                </span>
              )}
            </div>
            {client.startDate && (
              <p className="text-xs text-neutral-400 mt-1">
                {t("parent_portal.profile.therapy_since", {
                  date: new Date(client.startDate).toLocaleDateString(currentLang, { month: "short", year: "numeric" })
                })}
              </p>
            )}
          </div>
        </div>

        {/* Compact info row */}
        {client.supportLevel && (
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2">
            <Heart className="w-4 h-4 text-error-400" />
            <span className="text-xs text-neutral-500">{t("parent_portal.profile.support_level")}:</span>
            <span className="text-xs font-semibold text-neutral-900 dark:text-white">{client.supportLevel}</span>
          </div>
        )}
      </div>

      {/* Quick Links — Billing, Homework, Documents */}
      <section className="space-y-2">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">
          {t("parent_portal.profile.quick_links")}
        </p>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
          {/* Billing */}
          <Link
            href="/parent/billing/"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-warning-50 dark:bg-warning-900/20 flex items-center justify-center text-warning-500 flex-shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="flex-1 font-medium text-neutral-900 dark:text-white text-sm">
              {t("parent_nav.billing")}
            </span>
            {unpaidInvoiceCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-error-500 text-white">
                {t("parent_portal.profile.unpaid_invoices", { count: unpaidInvoiceCount })}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Homework */}
          <Link
            href="/parent/homework/"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500 flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="flex-1 font-medium text-neutral-900 dark:text-white text-sm">
              {t("parent_nav.homework")}
            </span>
            {incompleteHomeworkCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary-500 text-white">
                {t("parent_portal.profile.incomplete_homework", { count: incompleteHomeworkCount })}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          {/* Documents */}
          <Link
            href="/parent/docs/"
            className="flex items-center gap-3 px-4 py-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 flex items-center justify-center text-secondary-500 flex-shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <span className="flex-1 font-medium text-neutral-900 dark:text-white text-sm">
              {t("parent_nav.docs")}
            </span>
            <ChevronRight className="w-4 h-4 text-neutral-300 dark:text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Therapy Team */}
      {assignedTeam.length > 0 && (
        <section className="space-y-2">
          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">
            {t("parent_portal.profile.therapy_team")}
          </p>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
            {assignedTeam.map((therapist: any) => (
              <div
                key={therapist.id}
                className="px-4 py-3.5 flex items-center gap-3"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
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

      {/* Settings */}
      <section className="space-y-2">
        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest px-1">
          {t("parent_portal.profile.portal_settings")}
        </p>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden">
          {/* Push Notifications Toggle */}
          <div className="px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-500">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{t("parent_portal.profile.push_notifications")}</p>
                <p className="text-[10px] text-neutral-400">{t("parent_portal.profile.push_notifications_desc")}</p>
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
          <div className="px-4 py-3.5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 flex items-center justify-center text-secondary-500">
                <Globe className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-neutral-900 dark:text-white">{t("settings.appearance.language")}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'ro', label: 'Romana', flag: '🇷🇴' },
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

      {/* Sign Out */}
      <div className="pt-2">
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
