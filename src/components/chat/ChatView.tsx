"use client";

import { useState, useEffect, useRef } from "react";
import { ChatThread, ChatMessage, ChatParticipant } from "@/types/chat";
import { useAnyAuth } from "@/hooks/useAnyAuth";
import { useChatActions, useMessages } from "@/hooks/useChat";
import MessageBubble from "./MessageBubble";
import { Send, Phone, Video, Info, ArrowLeft, Loader2, Archive } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";
import { db } from "@/lib/firebase";

interface ChatViewProps {
  thread: ChatThread | null;
  onBack?: () => void;
}

export default function ChatView({ thread, onBack }: ChatViewProps) {
  const { t } = useTranslation();
  const { user, isStaff } = useAnyAuth();
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { messages, loading: messagesLoading } = useMessages(thread?.id || null);
  const { sendMessage, markAsRead, archiveThread } = useChatActions();
  const [inputText, setInputText] = useState("");
  const [isCalling, setIsCalling] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Mark as read when threadId changes or messages update
  useEffect(() => {
    if (thread?.id) {
      markAsRead(thread.id);
    }
  }, [thread?.id, messages, markAsRead]);

  const handleArchive = async () => {
    if (!thread) return;
    
    customConfirm({
      title: "Archive Conversation",
      message: t('chat.archive_confirm'),
      confirmLabel: "Archive",
      variant: 'warning',
      onConfirm: async () => {
        try {
          await archiveThread(thread.id);
          success(t('chat.archive_success'));
          if (onBack) onBack();
        } catch (err) {
          console.error(err);
          error(t('chat.archive_error'));
        }
      }
    });
  };

  const handleCall = async () => {
    if (!thread) return;
    const otherParticipantId = thread.participants.find(id => id !== user?.uid);
    if (!otherParticipantId) return;

    const otherUser = thread.participantDetails[otherParticipantId];
    let phone = otherUser?.phone;

    // If phone is missing, try to fetch it from the database
    if (!phone) {
      setIsCalling(true);
      try {
        if (otherUser.role === 'Parent' && otherUser.clientId) {
          // Fetch from clients collection
          const clientSnap = await getDoc(doc(db, "clients", otherUser.clientId));
          if (clientSnap.exists()) {
            phone = clientSnap.data().phone;
          }
        } else {
          // Fetch from team_members
          const memberSnap = await getDoc(doc(db, "team_members", otherParticipantId));
          if (memberSnap.exists()) {
            phone = memberSnap.data().phone;
          }
        }

        // Note: Do NOT cache phone numbers in thread documents for privacy
        // Phone numbers are fetched on-demand each time to prevent exposure to other participants
      } catch (err) {
        console.error("[ChatView] Error fetching phone number:", err);
      } finally {
        setIsCalling(false);
      }
    }
    
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      error(t('chat.no_phone'));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!thread?.id || !inputText.trim()) return;

    const text = inputText;
    setInputText("");
    await sendMessage(thread.id, text);
  };

  if (!thread) {
    return (
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-900/50 text-neutral-500">
        <div className="w-20 h-20 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mb-4">
          <Info className="w-10 h-10" />
        </div>
        <h3 className="text-lg font-bold">{t('chat.select_conversation')}</h3>
        <p className="text-sm">{t('chat.select_contact')}</p>
      </div>
    );
  }

  const otherParticipantId = thread.participants.find(id => id !== user?.uid);
  const otherUser = thread.participantDetails[otherParticipantId || ""];

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm overflow-hidden"
            style={{ backgroundColor: otherUser?.photoURL ? 'transparent' : (otherUser?.color || '#ccc') }}
          >
            {otherUser?.photoURL ? (
              <img src={otherUser.photoURL} alt={otherUser.name} className="w-full h-full object-cover" />
            ) : (
              otherUser?.initials || "??"
            )}
          </div>
          <div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">{otherUser?.name || t('chat.unknown_user')}</h3>
            <p className="text-[10px] text-neutral-500 font-medium">{otherUser?.role || t('common.unknown')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isStaff && (
            <button 
              onClick={handleArchive}
              title="Archive Conversation"
              className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <Archive className="w-5 h-5" />
            </button>
          )}
          <button 
            onClick={handleCall}
            disabled={isCalling}
            title="Call"
            className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
          >
            {isCalling ? <Loader2 className="w-5 h-5 animate-spin" /> : <Phone className="w-5 h-5" />}
          </button>
          <button className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><Video className="w-5 h-5" /></button>
          <button className="p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"><Info className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 custom-scrollbar"
      >
        {messagesLoading && messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}
        {messages.length === 0 && !messagesLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50 py-12">
            <p className="text-sm">{t('chat.no_messages')}</p>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input 
            type="text" 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('chat.type_message')}
            className="flex-1 px-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!inputText.trim()}
            className="p-2.5 rounded-xl bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50 disabled:hover:bg-primary-500 transition-all"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}