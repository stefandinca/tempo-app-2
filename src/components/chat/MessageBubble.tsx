"use client";

import { ChatMessage } from "@/types/chat";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { user } = useAuth();
  const isMe = message.senderId === user?.uid;

  return (
    <div className={clsx(
      "flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isMe ? "justify-end" : "justify-start"
    )}>
      <div className={clsx(
        "max-w-[75%] px-4 py-2 rounded-2xl shadow-sm",
        isMe 
          ? "bg-primary-500 text-white rounded-tr-none" 
          : "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-tl-none"
      )}>
        <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
        <p className={clsx(
          "text-[10px] mt-1 text-right opacity-70",
          isMe ? "text-primary-100" : "text-neutral-500"
        )}>
          {message.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || "sending..."}
        </p>
      </div>
    </div>
  );
}
