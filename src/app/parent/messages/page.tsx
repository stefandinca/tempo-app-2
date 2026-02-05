"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatView from "@/components/chat/ChatView";
import NewChatModal from "@/components/chat/NewChatModal";
import { useThreads, useChatActions } from "@/hooks/useChat";
import { ChatParticipant } from "@/types/chat";
import { clsx } from "clsx";
import { useParentAuth } from "@/context/ParentAuthContext";
import { useRouter, useSearchParams } from "next/navigation";

export default function ParentMessagesPage() {
  const searchParams = useSearchParams();
  const threadIdParam = searchParams.get("threadId");
  const { isAuthenticated, loading: authLoading } = useParentAuth();
  const router = useRouter();
  const { threads, loading: threadsLoading } = useThreads();
  const { createOrGetThread } = useChatActions();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Handle threadId from URL
  useEffect(() => {
    if (threadIdParam) {
      setActiveThreadId(threadIdParam);
    }
  }, [threadIdParam]);

  // Protect route
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/parent");
    }
  }, [authLoading, isAuthenticated, router]);

  const handleStartChat = async (participant: ChatParticipant) => {
    const threadId = await createOrGetThread(participant);
    if (threadId) {
      setActiveThreadId(threadId);
      setIsNewChatModalOpen(false);
    }
  };

  const activeThread = threads.find(t => t.id === activeThreadId) || null;

  if (authLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100dvh-64px)] lg:h-[calc(100vh-64px)] relative bg-white dark:bg-neutral-950">
      
      {/* Sidebar - Hidden on mobile if a thread is active */}
      <div className={clsx(
        "flex",
        activeThreadId ? "hidden lg:flex" : "flex w-full lg:w-80"
      )}>
        <ChatSidebar 
          threads={threads} 
          activeThreadId={activeThreadId}
          onSelectThread={setActiveThreadId}
          onNewChat={() => setIsNewChatModalOpen(true)}
        />
      </div>

      {/* Main Chat View - Hidden on mobile if no thread is active */}
      <div className={clsx(
        "flex-1",
        !activeThreadId ? "hidden lg:flex" : "flex"
      )}>
        <ChatView 
          thread={activeThread} 
          onBack={() => setActiveThreadId(null)}
        />
      </div>

      <NewChatModal 
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onStartChat={handleStartChat}
      />
    </div>
  );
}
