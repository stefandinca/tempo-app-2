"use client";

import { ChatThread } from "@/types/chat";
import { useAnyAuth } from "@/hooks/useAnyAuth";
import { clsx } from "clsx";
import { Search, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import i18n from "@/lib/i18n";

interface ChatSidebarProps {
  threads: ChatThread[];
  activeThreadId: string | null;
  onSelectThread: (id: string) => void;
  onNewChat: () => void;
}

export default function ChatSidebar({ threads, activeThreadId, onSelectThread, onNewChat }: ChatSidebarProps) {
  const { t } = useTranslation();
  const { user } = useAnyAuth();

  return (
    <div className="w-full lg:w-80 border-r border-neutral-200 dark:border-neutral-800 flex flex-col bg-white dark:bg-neutral-900">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <h2 className="font-bold text-lg text-neutral-900 dark:text-white">{t('chat.title')}</h2>
        <button 
          onClick={onNewChat}
          className="p-2 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder={t('chat.search_placeholder')}
            className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
        </div>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {threads.map((thread) => {
          const otherParticipantId = thread.participants.find(id => id !== user?.uid);
          const otherUser = thread.participantDetails[otherParticipantId || ""];
          const isUnread = thread.lastMessage && !thread.lastMessage.readBy.includes(user?.uid || "");

          return (
            <button
              key={thread.id}
              onClick={() => onSelectThread(thread.id)}
              className={clsx(
                "w-full p-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors text-left border-b border-neutral-50 dark:border-neutral-800/50",
                activeThreadId === thread.id && "bg-primary-50/50 dark:bg-primary-900/10 border-l-4 border-l-primary-500"
              )}
            >
              <div 
                className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-sm overflow-hidden"
                style={{ backgroundColor: otherUser?.photoURL ? 'transparent' : (otherUser?.color || '#ccc') }}
              >
                {otherUser?.photoURL ? (
                  <img src={otherUser.photoURL} alt={otherUser.name} className="w-full h-full object-cover" />
                ) : (
                  otherUser?.initials || "??"
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className={clsx(
                    "font-bold text-sm truncate",
                    isUnread ? "text-neutral-900 dark:text-white" : "text-neutral-700 dark:text-neutral-300"
                  )}>
                    {otherUser?.name || t('common.unknown')}
                  </h3>
                  <span className="text-[10px] text-neutral-400">
                    {thread.updatedAt?.toDate().toLocaleDateString(i18n.language || 'ro', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={clsx(
                    "text-xs truncate pr-4",
                    isUnread ? "font-bold text-neutral-900 dark:text-white" : "text-neutral-500 dark:text-neutral-400"
                  )}>
                    {thread.lastMessage?.text || t('chat.started_conversation')}
                  </p>
                  {isUnread && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            </button>
          );
        })}

        {threads.length === 0 && (
          <div className="text-center py-12 px-4">
            <p className="text-sm text-neutral-500">{t('chat.no_conversations')}</p>
            <button 
              onClick={onNewChat}
              className="mt-2 text-sm text-primary-600 font-medium hover:underline"
            >
              {t('chat.start_chatting')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
