"use client";

import { useState, useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatView from "@/components/chat/ChatView";
import NewChatModal from "@/components/chat/NewChatModal";
import { useThreads, useChatActions } from "@/hooks/useChat";
import { ChatParticipant } from "@/types/chat";
import { clsx } from "clsx";

export default function MessagesPage() {
  const { threads, loading } = useThreads();
  const { createOrGetThread } = useChatActions();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

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

  const activeThread = threads.find(t => t.id === activeThreadId) || null;

  return (
    <div className="flex-1 flex overflow-hidden h-[calc(100vh-64px)] lg:h-full relative">
      
      {/* Sidebar - Hidden on mobile if a thread is active */}
      <div className={clsx(
        "flex",
        activeThreadId ? "hidden lg:flex" : "flex w-full lg:w-auto"
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
