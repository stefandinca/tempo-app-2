import { Timestamp } from "firebase/firestore";

export interface ChatParticipant {
  id: string;
  name: string;
  photoURL?: string;
  initials: string;
  color: string;
  role: string;
  phone?: string;
  clientId?: string;
}

export interface LastMessage {
  text: string;
  senderId: string;
  timestamp: Timestamp;
  readBy: string[];
}

export interface ChatThread {
  id: string;
  participants: string[]; // Array of UIDs
  participantDetails: Record<string, ChatParticipant>;
  lastMessage?: LastMessage;
  updatedAt: Timestamp;
  createdAt: Timestamp;
  isArchived?: boolean;
  archivedBy?: string[]; // Array of UIDs who archived it
  clientId?: string; // Associated client (child) for parent portal threads
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
  type: 'text' | 'system' | 'image';
  metadata?: Record<string, any>;
}
