"use client";

import { useMemo } from "react";
import { User, Calendar, Heart, Clipboard, MessageSquare, FileText, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePortalData, PortalLoading, PortalError } from "../PortalContext";
import { useTeamMembers, useInterventionPlans } from "@/hooks/useCollections";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

export default function ParentProfilePage() {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.startsWith("ro") ? "ro-RO" : "en-US";
  const { data: client, loading, error } = usePortalData();
  const { data: team } = useTeamMembers();
  const { activePlan } = useInterventionPlans(client?.id || "");

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

      {/* Therapy Team */}
      {assignedTeam.length > 0 && (
        <section className="space-y-3">
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
    </div>
  );
}
