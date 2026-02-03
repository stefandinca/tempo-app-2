import { useState, useEffect } from "react";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc, 
  getDoc,
  updateDoc,
  arrayUnion,
  Timestamp,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { ChatThread, ChatMessage, ChatParticipant } from "@/types/chat";

export function useThreads() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "threads"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threadList: ChatThread[] = [];
      snapshot.forEach((doc) => {
        threadList.push({ id: doc.id, ...doc.data() } as ChatThread);
      });
      setThreads(threadList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { threads, loading };
}

export function useMessages(threadId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "threads", threadId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messageList: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        messageList.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      setMessages(messageList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [threadId]);

  return { messages, loading };
}

export function useChatActions() {
  const { user, userData } = useAuth();

  const sendMessage = async (threadId: string, text: string) => {
    if (!user || !text.trim()) return;

    const messageData = {
      senderId: user.uid,
      text: text.trim(),
      timestamp: serverTimestamp(),
      type: 'text'
    };

    // 1. Add message to subcollection
    await addDoc(collection(db, "threads", threadId, "messages"), messageData);

    // 2. Update thread's last message and updatedAt
    await updateDoc(doc(db, "threads", threadId), {
      lastMessage: {
        text: text.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp(),
        readBy: [user.uid]
      },
      updatedAt: serverTimestamp()
    });
  };

  const createOrGetThread = async (otherUser: ChatParticipant) => {
    if (!user || !userData) return null;

    // Deterministic ID for 1:1 chats
    const threadId = [user.uid, otherUser.id].sort().join("_");
    const threadRef = doc(db, "threads", threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      const currentUserParticipant: ChatParticipant = {
        id: user.uid,
        name: userData.name || "Unknown",
        initials: userData.initials || "??",
        color: userData.color || "#ccc",
        role: userData.role || "Staff"
      };

      await setDoc(threadRef, {
        participants: [user.uid, otherUser.id],
        participantDetails: {
          [user.uid]: currentUserParticipant,
          [otherUser.id]: otherUser
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }

    return threadId;
  };

  const markAsRead = async (threadId: string) => {
    if (!user) return;
    await updateDoc(doc(db, "threads", threadId), {
      "lastMessage.readBy": arrayUnion(user.uid)
    });
  };

  return { sendMessage, createOrGetThread, markAsRead };
}
