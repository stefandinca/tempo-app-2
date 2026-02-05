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
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  Timestamp,
  limit
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAnyAuth } from "@/hooks/useAnyAuth";
import { useAuth } from "@/context/AuthContext";
import { useParentAuthOptional } from "@/context/ParentAuthContext";
import { useClient } from "@/hooks/useClient";
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
        const data = doc.data() as ChatThread;
        // Only show if not archived by this user
        if (!data.archivedBy?.includes(user.uid)) {
          threadList.push({ ...data, id: doc.id } as ChatThread);
        }
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
  const { data: client } = useClient(parentAuth?.clientId || "");

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

    // 2. Update thread's last message and updatedAt, and clear archivedBy for everyone
    await updateDoc(doc(db, "threads", threadId), {
      lastMessage: {
        text: text.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp(),
        readBy: [user.uid]
      },
      updatedAt: serverTimestamp(),
      archivedBy: [] // Unarchive for everyone when a new message arrives
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

    // We check for an existing active (not archived) thread first
    const q = query(
      collection(db, "threads"),
      where("participants", "array-contains", user.uid),
      orderBy("updatedAt", "desc")
    );
    
    const querySnap = await getDocs(q);
    let activeThreadId: string | null = null;

    querySnap.forEach(doc => {
      const data = doc.data() as ChatThread;
      // It's truly active if NO ONE has archived it and it has the other participant
      if (data.participants.includes(otherUser.id) && (!data.archivedBy || data.archivedBy.length === 0)) {
        activeThreadId = doc.id;
      }
    });

    if (activeThreadId) {
      // Thread exists, but let's make sure participantDetails are up to date 
      const threadData = querySnap.docs.find(d => d.id === activeThreadId)?.data() as ChatThread;
      const myDetails = threadData?.participantDetails[user.uid];
      const otherDetailsInThread = threadData?.participantDetails[otherUser.id];
      
      // Update OTHER user if we have more info now (like phone/clientId)
      if (otherUser.phone && (!otherDetailsInThread?.phone || !otherDetailsInThread?.clientId)) {
        await updateDoc(doc(db, "threads", activeThreadId), {
          [`participantDetails.${otherUser.id}.phone`]: otherUser.phone,
          [`participantDetails.${otherUser.id}.clientId`]: otherUser.clientId || otherDetailsInThread?.clientId || ""
        });
      }

      if (!myDetails || myDetails.name === "Unknown" || myDetails.name === "Staff Member" || (isParent && myDetails.name === "Parent") || !myDetails.phone) {
        let updatedMyDetails: ChatParticipant;
        if (isParent) {
          updatedMyDetails = {
            id: user.uid,
            name: parentAuth?.clientName ? `Parent of ${parentAuth.clientName}` : "Parent",
            initials: "P",
            color: "#4A90E2",
            role: "Parent",
            phone: client?.phone || "",
            clientId: parentAuth?.clientId || ""
          };
        } else {
          const userData = staffAuth?.userData;
          updatedMyDetails = {
            id: user.uid,
            name: userData?.name || "Staff Member",
            initials: userData?.initials || "S",
            color: userData?.color || "#ccc",
            role: role || "Staff",
            phone: userData?.phone || ""
          };
        }

        await updateDoc(doc(db, "threads", activeThreadId), {
          [`participantDetails.${user.uid}`]: updatedMyDetails
        });
      }
      return activeThreadId;
    }

    // If no active thread, create a new one with a unique ID
    const threadRef = doc(collection(db, "threads"));
    const threadId = threadRef.id;

    let currentUserParticipant: ChatParticipant;

    if (isParent) {
      currentUserParticipant = {
        id: user.uid,
        name: parentAuth?.clientName ? `Parent of ${parentAuth.clientName}` : "Parent",
        initials: "P",
        color: "#4A90E2",
        role: "Parent",
        phone: client?.phone || "",
        clientId: parentAuth?.clientId || ""
      };
    } else {
      const userData = staffAuth?.userData;
      currentUserParticipant = {
        id: user.uid,
        name: userData?.name || "Staff Member",
        initials: userData?.initials || "S",
        color: userData?.color || "#ccc",
        role: role || "Staff",
        phone: userData?.phone || ""
      };
    }

    await setDoc(threadRef, {
      participants: [user.uid, otherUser.id],
      participantDetails: {
        [user.uid]: currentUserParticipant,
        [otherUser.id]: otherUser
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      archivedBy: []
    });

    return threadId;
  };

  const archiveThread = async (threadId: string) => {
    if (!user) return;
    await updateDoc(doc(db, "threads", threadId), {
      archivedBy: arrayUnion(user.uid)
    });
  };

  const markAsRead = async (threadId: string) => {
    if (!user) return;
    await updateDoc(doc(db, "threads", threadId), {
      "lastMessage.readBy": arrayUnion(user.uid)
    });
  };

  return { sendMessage, createOrGetThread, markAsRead, archiveThread };
}