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
import { useAnyAuth } from "@/hooks/useAnyAuth";
import { useAuth } from "@/context/AuthContext";
import { useParentAuthOptional } from "@/context/ParentAuthContext";
import { ChatThread, ChatMessage, ChatParticipant } from "@/types/chat";
import { notifyMessageReceived } from "@/lib/notificationService";
import { NotificationRecipientRole } from "@/types/notifications";

export function useThreads() {
  const { user } = useAnyAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

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
  const { user, isParent, role } = useAnyAuth();
  const staffAuth = useAuth();
  const parentAuth = useParentAuthOptional();

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

    // 3. Trigger notification
    try {
      const threadSnap = await getDoc(doc(db, "threads", threadId));
      if (threadSnap.exists()) {
        const threadData = threadSnap.data() as ChatThread;
        const otherParticipantId = threadData.participants.find(id => id !== user.uid);
        const otherUser = otherParticipantId ? threadData.participantDetails[otherParticipantId] : null;
        
        if (otherParticipantId && otherUser) {
          // Get sender name
          let senderName = "Someone";
          if (isParent) {
            // If sender is parent, use parentAuth if available, or thread details
            const myDetails = threadData.participantDetails[user.uid];
            senderName = myDetails?.name || (parentAuth?.clientName ? `Parent of ${parentAuth.clientName}` : "Parent");
          } else {
            // If sender is staff, use staffAuth if available, or thread details
            const myDetails = threadData.participantDetails[user.uid];
            senderName = myDetails?.name || staffAuth?.userData?.name || "Staff Member";
          }

          await notifyMessageReceived(
            otherParticipantId,
            otherUser.role.toLowerCase() as NotificationRecipientRole,
            {
              senderName,
              text: text.trim(),
              threadId,
              triggeredByUserId: user.uid
            }
          );
        }
      }
    } catch (err) {
      console.error("[useChat] Error sending notification:", err);
    }
  };

  const createOrGetThread = async (otherUser: ChatParticipant) => {
    if (!user) return null;

    // Deterministic ID for 1:1 chats
    const threadId = [user.uid, otherUser.id].sort().join("_");
    const threadRef = doc(db, "threads", threadId);
    const threadSnap = await getDoc(threadRef);

    if (!threadSnap.exists()) {
      let currentUserParticipant: ChatParticipant;

      if (isParent) {
        currentUserParticipant = {
          id: user.uid,
          name: parentAuth?.clientName ? `Parent of ${parentAuth.clientName}` : "Parent",
          initials: "P",
          color: "#4A90E2",
          role: "Parent"
        };
      } else {
        const userData = staffAuth?.userData;
        currentUserParticipant = {
          id: user.uid,
          name: userData?.name || "Staff Member",
          initials: userData?.initials || "S",
          color: userData?.color || "#ccc",
          role: role || "Staff"
        };
      }

      await setDoc(threadRef, {
        participants: [user.uid, otherUser.id],
        participantDetails: {
          [user.uid]: currentUserParticipant,
          [otherUser.id]: otherUser
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Thread exists, but let's make sure participantDetails are up to date 
      // (especially for parents who might have been 'Unknown' before)
      const threadData = threadSnap.data() as ChatThread;
      const myDetails = threadData.participantDetails[user.uid];
      
      if (!myDetails || myDetails.name === "Unknown" || myDetails.name === "Staff Member" || (isParent && myDetails.name === "Parent")) {
        let updatedMyDetails: ChatParticipant;
        if (isParent) {
          updatedMyDetails = {
            id: user.uid,
            name: parentAuth?.clientName ? `Parent of ${parentAuth.clientName}` : "Parent",
            initials: "P",
            color: "#4A90E2",
            role: "Parent"
          };
        } else {
          const userData = staffAuth?.userData;
          updatedMyDetails = {
            id: user.uid,
            name: userData?.name || "Staff Member",
            initials: userData?.initials || "S",
            color: userData?.color || "#ccc",
            role: role || "Staff"
          };
        }

        await updateDoc(threadRef, {
          [`participantDetails.${user.uid}`]: updatedMyDetails
        });
      }
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

