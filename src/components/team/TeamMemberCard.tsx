"use client";

import { Edit, User, Mail, Calendar, Phone, MessageSquare, Loader2, FileText } from "lucide-react";
import { clsx } from "clsx";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";
import { useChatActions } from "@/hooks/useChat";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
  email: string;
  phone?: string;
  photoURL?: string;
  sessions?: number;
  clients?: number;
  isActive?: boolean;
  baseSalary?: number;
  defaultBonus?: number;
}

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
}

export default function TeamMemberCard({ member, onEdit }: TeamMemberCardProps) {
  const { t } = useTranslation();
  const { userRole, user } = useAuth();
  const { createOrGetThread } = useChatActions();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const router = useRouter();

  const isMe = user?.uid === member.id;
  const isAdmin = userRole === 'Admin';

  const handleMessage = async () => {
    setIsStartingChat(true);
    try {
      const threadId = await createOrGetThread({
        id: member.id,
        name: member.name,
        initials: member.initials,
        color: member.color,
        role: member.role,
        phone: member.phone
      });
      if (threadId) {
        router.push(`/messages?threadId=${threadId}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStartingChat(false);
    }
  };

  const handleGenerateReport = () => {
    window.open(`/reports/team/?id=${member.id}`, '_blank');
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:shadow-md transition-all group relative">
      
      {/* Action Buttons (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        {isAdmin && (
          <button 
            onClick={() => onEdit(member)}
            className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-500 transition-colors"
            title={t('common.edit')}
          >
            <Edit className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Header: Avatar & Name */}
      <div className="flex items-start gap-4 mb-4">
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: member.photoURL ? 'transparent' : (member.color || '#ccc') }}
        >
          {member.photoURL ? (
            <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
          ) : (
            member.initials
          )}
        </div>
        <div className="min-w-0">
          <Link href="/team/" className="hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
            <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-tight truncate">
              {member.name}
              {isMe && <span className="ml-2 text-xs font-normal text-neutral-400">({t('common.you')})</span>}
            </h3>
          </Link>
          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium truncate">{member.role}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
            <span className={clsx(
              "w-2 h-2 rounded-full",
              member.isActive !== false ? "bg-success-500" : "bg-neutral-300"
            )} />
            {member.isActive !== false ? t('team.active') : t('team.inactive')}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-4 pb-4">
        <div className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <Mail className="w-4 h-4 text-neutral-400" />
          <span className="truncate">{member.email || t('team.no_email')}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <Phone className="w-4 h-4 text-neutral-400" />
          <span className="truncate">{member.phone || t('team.no_phone')}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <User className="w-4 h-4 text-neutral-400" />
          <span>{t('team.active_clients', { count: member.clients || 0 })}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <span>{t('team.sessions_week', { count: member.sessions || 0 })}</span>
        </div>
      </div>

      {/* Action: Buttons */}
      <div className="pt-3 border-t border-neutral-50 dark:border-neutral-800/50 mt-2 space-y-2">
        {!isMe && (
          <button
            onClick={handleMessage}
            disabled={isStartingChat}
            className="w-full flex items-center justify-center gap-2 py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-xl text-sm font-bold hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all disabled:opacity-50"
          >
            {isStartingChat ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            {t('team.message')}
          </button>
        )}
        {isAdmin && (
          <button
            onClick={handleGenerateReport}
            className="w-full flex items-center justify-center gap-2 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 rounded-xl text-sm font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
          >
            <FileText className="w-4 h-4 text-primary-500" />
            {t('reports.team.generate') || "Generate Report"}
          </button>
        )}
      </div>
    </div>
  );
}