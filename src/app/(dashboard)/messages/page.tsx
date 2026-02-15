"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatView from "@/components/chat/ChatView";
import NewChatModal from "@/components/chat/NewChatModal";
import { useThreads, useArchivedThreads, useChatActions } from "@/hooks/useChat";
import { ChatParticipant } from "@/types/chat";
import { clsx } from "clsx";
import { useSearchParams } from "next/navigation";

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const threadIdParam = searchParams.get("threadId");
  const { threads, loading } = useThreads();
  const [viewMode, setViewMode] = useState<'active' | 'archived'>('active');
  // Only query archived threads when user clicks "Archived" tab (prevents Firestore index error on page load)
  const { archivedThreads, loading: archivedLoading } = useArchivedThreads(viewMode === 'archived');
  const { createOrGetThread } = useChatActions();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

  // Handle threadId from URL
  useEffect(() => {
    if (threadIdParam) {
      setActiveThreadId(threadIdParam);
    }
  }, [threadIdParam]);

  // Handle actions from Command Palette
  useEffect(() => {
    const action = sessionStorage.getItem("commandPaletteAction");
    if (action === "new-message") {
      setIsNewChatModalOpen(true);
      sessionStorage.removeItem("commandPaletteAction");
    }
  }, []);

  const handleStartChat = async (participant: ChatParticipant) => {
    const threadId = await createOrGetThread(participant);
    if (threadId) {
      setActiveThreadId(threadId);
      setIsNewChatModalOpen(false);
    }
  };

  // Find active thread in both active and archived lists
  const activeThread = threads.find(t => t.id === activeThreadId) || archivedThreads.find(t => t.id === activeThreadId) || null;

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100dvh-64px)] lg:h-[calc(100vh-64px)] relative">
      
      {/* Sidebar - Hidden on mobile if a thread is active */}
      <div className={clsx(
        "flex",
        activeThreadId ? "hidden lg:flex" : "flex w-full lg:w-auto"
      )}>
        <ChatSidebar
          threads={threads}
          archivedThreads={archivedThreads}
          activeThreadId={activeThreadId}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
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
