"use client";

import { Key, Calendar, Clock, BarChart, ClipboardCheck, ChevronRight, RefreshCw, Copy, Check, MessageSquare, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useToast } from "@/context/ToastContext";
import { useClientEvents } from "@/hooks/useCollections";
import { useClientEvaluations } from "@/hooks/useEvaluations";
import { useChatActions } from "@/hooks/useChat";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

interface ClientStatsCardsProps {
  client: any;
}

export default function ClientStatsCards({ client }: ClientStatsCardsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const { createOrGetThread } = useChatActions();
  const { data: events, loading: eventsLoading } = useClientEvents(client.id);
  const { evaluations, loading: evaluationsLoading } = useClientEvaluations(client.id);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [copied, setCopied] = useState(false);

  // --- Calculations ---
  const totalSessions = events?.length || 0;
  const completedSessions = events?.filter(e => e.status === 'completed') || [];
  const presentSessions = completedSessions.filter(e => e.attendance === 'present').length;
  const attendanceRate = completedSessions.length > 0 
    ? Math.round((presentSessions / completedSessions.length) * 100) 
    : 0;
  const activeProgramsCount = client.programIds?.length || 0;

  const latestEval = evaluations.find(e => e.status === "completed") || evaluations[0];

  // --- Handlers ---
  const generateCode = async () => {
    setIsGenerating(true);
    try {
      const initials = client.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
      const random = Math.floor(1000 + Math.random() * 9000);
      const newCode = `${initials}-${random}`;
      await updateDoc(doc(db, "clients", client.id), { clientCode: newCode });
      success(t('clients.code_generated') || "New access code generated!");
    } catch (err) {
      toastError(t('clients.code_error') || "Failed to generate code");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyInviteLink = () => {
    if (!client.clientCode) return;
    const link = `${window.location.origin}/parent/?code=${client.clientCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    success(t('clients.link_copied') || "Link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMessageParent = async () => {
    setIsStartingChat(true);
    try {
      // Use most recent parent UID if available, otherwise use clientId as placeholder
      // Deterministic thread ID uses clientId, so thread will work regardless
      const parentId = client.parentUids?.length
        ? client.parentUids[client.parentUids.length - 1]
        : client.id;

      const threadId = await createOrGetThread({
        id: parentId,
        name: client.parentName || `Parent of ${client.name}`,
        initials: "P",
        color: "#4A90E2",
        role: "Parent",
        clientId: client.id
      });
      if (threadId) router.push(`/messages?threadId=${threadId}`);
    } catch (err) {
      toastError(t('clients.chat_error') || "Failed to start chat");
    } finally {
      setIsStartingChat(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-6">
      
      {/* 1. Portal Access Card */}
      <div className="bg-white dark:bg-neutral-900 p-3 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col lg:justify-between group">
        <div className="flex items-center justify-between mb-2 lg:mb-4">
          <div className="flex items-center gap-3">
            <div className="p-1.5 lg:p-2 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600">
              <Key className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </div>
            <span className="text-[10px] lg:text-xs font-bold text-neutral-500 uppercase tracking-wider font-display">{t('clients.portal_access') || 'Portal Access'}</span>
          </div>
        </div>
        
        {client.clientCode ? (
          <div className="flex flex-col sm:flex-row lg:flex-col gap-2">
            <div className="flex flex-1 items-center justify-between bg-neutral-50 dark:bg-neutral-800 rounded-xl px-3 py-1.5 lg:px-4 lg:py-2 border border-neutral-100 dark:border-neutral-800">
              <span className="text-base lg:text-lg font-mono font-bold text-primary-600 tracking-wider uppercase">{client.clientCode}</span>
              <div className="flex gap-0.5 lg:gap-1">
                <button onClick={copyInviteLink} className="p-1 lg:p-1.5 text-neutral-400 hover:text-primary-600 transition-colors">
                  {copied ? <Check className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-success-500" /> : <Copy className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                </button>
                <button onClick={generateCode} disabled={isGenerating} className="p-1 lg:p-1.5 text-neutral-400 hover:text-primary-600 transition-colors">
                  <RefreshCw className={clsx("w-3.5 h-3.5 lg:w-4 lg:h-4", isGenerating && "animate-spin")} />
                </button>
              </div>
            </div>
            {client.clientCode && (
              <button onClick={handleMessageParent} disabled={isStartingChat} className="flex-1 flex items-center justify-center gap-2 py-1.5 lg:py-2 text-[10px] lg:text-xs font-bold text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors border border-primary-100 dark:border-primary-900/30 lg:border-none">
                {isStartingChat ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageSquare className="w-3 h-3" />}
                {t('clients.message_parent') || 'Message Parent'}
              </button>
            )}
          </div>
        ) : (
          <button onClick={generateCode} disabled={isGenerating} className="w-full py-2 lg:py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs lg:text-sm font-bold shadow-lg shadow-primary-600/20 transition-all flex items-center justify-center gap-2">
            {isGenerating ? <Loader2 className="w-3.5 h-3.5 lg:w-4 lg:h-4 animate-spin" /> : <Key className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
            {t('clients.generate_access') || 'Generate Access'}
          </button>
        )}
      </div>

      {/* 2. Quick Stats Card */}
      <div className="bg-white dark:bg-neutral-900 p-3 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2 lg:mb-4">
          <div className="p-1.5 lg:p-2 rounded-lg bg-success-50 dark:bg-success-900/20 text-success-600">
            <BarChart className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </div>
          <span className="text-[10px] lg:text-xs font-bold text-neutral-500 uppercase tracking-wider font-display">{t('clients.clinical_stats') || 'Clinical Stats'}</span>
        </div>
        
        <div className="flex items-center justify-between lg:grid lg:grid-cols-2 gap-3 lg:gap-4">
          <div className="flex items-center gap-4 lg:block">
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-0.5 lg:mb-1">{t('dashboard.attendance_rate')}</p>
              <p className={clsx("text-base lg:text-xl font-bold font-display", attendanceRate >= 90 ? "text-success-600" : attendanceRate >= 75 ? "text-warning-600" : "text-error-600")}>
                {eventsLoading ? "..." : `${attendanceRate}%`}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-neutral-400 uppercase mb-0.5 lg:mb-1">{t('clients.tabs.programs')}</p>
              <p className="text-base lg:text-xl font-bold text-primary-600 font-display">{activeProgramsCount}</p>
            </div>
          </div>
          <p className="text-[10px] text-neutral-400 italic font-medium lg:col-span-2">{t('clients.based_on_sessions', { count: totalSessions })}</p>
        </div>
      </div>

      {/* 3. Latest Assessment Card */}
      <div className="bg-white dark:bg-neutral-900 p-3 lg:p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col justify-between">
        <div className="flex items-center gap-3 mb-2 lg:mb-4">
          <div className="p-1.5 lg:p-2 rounded-lg bg-warning-50 dark:bg-warning-900/20 text-warning-600">
            <ClipboardCheck className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
          </div>
          <span className="text-[10px] lg:text-xs font-bold text-neutral-500 uppercase tracking-wider font-display">{t('clients.latest_assessment') || 'Latest Assessment'}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {latestEval ? (
              <>
                <div>
                  <p className="text-base lg:text-lg font-bold text-neutral-900 dark:text-white font-display">{latestEval.overallPercentage}%</p>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase">{latestEval.type}</p>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium hidden sm:block">
                  {t('evaluations.completed')}: {new Date(latestEval.completedAt || latestEval.updatedAt).toLocaleDateString(i18n.language || 'ro')}
                </p>
              </>
            ) : (
              <Link href={`/clients/profile?id=${client.id}&tab=evaluations`} className="text-xs lg:text-sm font-bold text-primary-600 hover:underline flex items-center gap-1">
                {t('clients.start_evaluation')} <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </Link>
            )}
          </div>
          {latestEval && (
            <Link 
              href={`/clients/profile?id=${client.id}&tab=evaluations`}
              className="p-1.5 lg:p-2 bg-neutral-50 dark:bg-neutral-800 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors text-neutral-400 hover:text-primary-600"
            >
              <ChevronRight className="w-4 h-4 lg:w-5 lg:h-5" />
            </Link>
          )}
        </div>
      </div>

    </div>
  );
}
