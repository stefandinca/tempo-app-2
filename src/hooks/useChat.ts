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
  const { user, isParent, clientId } = useAnyAuth();
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // For parents, we query by clientId so they see history even if UID changes
    // For staff, we still query by participants
    const q = (isParent && clientId)
      ? query(
          collection(db, "threads"),
          where("clientId", "==", clientId),
          orderBy("updatedAt", "desc")
        )
      : query(
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
  }, [user, isParent, clientId]);

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
  const { user, isParent, role, clientId } = useAnyAuth();
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

          // Use threadData.clientId as priority for parent notifications
          const finalClientId = threadData.clientId || (isParent ? clientId : (otherUser.role === 'Parent' ? otherUser.clientId : undefined));

          await notifyMessageReceived(
            otherParticipantId,
            otherUser.role.toLowerCase() as NotificationRecipientRole,
            {
              senderName,
              text: text.trim(),
              threadId,
              triggeredByUserId: user.uid,
              clientId: finalClientId || undefined
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

    const targetClientId = isParent ? (parentAuth?.clientId || "") : (otherUser.role === 'Parent' ? otherUser.clientId : "");
    
    console.log("[useChat] Starting chat with:", otherUser.id, "role:", otherUser.role, "targetClientId:", targetClientId);

    try {
      // 1. First, try to find a thread where BOTH are participants
      const q = query(
        collection(db, "threads"),
        where("participants", "array-contains", user.uid),
        orderBy("updatedAt", "desc")
      );
      
      const querySnap = await getDocs(q);
      let activeThreadId: string | null = null;

      querySnap.forEach(doc => {
        const data = doc.data() as ChatThread;
        // Check if the other participant matches
        if (data.participants.includes(otherUser.id)) {
          activeThreadId = doc.id;
        }
      });

      // 2. If not found by participant and we have a clientId, try finding by clientId 
      // (This handles cases where parent UID changed but thread exists for child)
      if (!activeThreadId && targetClientId) {
        // Staff can only query threads where they are participants
        const qByClient = query(
          collection(db, "threads"),
          where("participants", "array-contains", user.uid),
          where("clientId", "==", targetClientId),
          orderBy("updatedAt", "desc")
        );
        const clientQuerySnap = await getDocs(qByClient);
        
        clientQuerySnap.forEach(doc => {
          const data = doc.data() as ChatThread;
          // Verify the other participant is indeed the one we're looking for
          if (data.participants.includes(otherUser.id)) {
            activeThreadId = doc.id;
          }
        });
      }

      if (activeThreadId) {
        console.log("[useChat] Found existing thread:", activeThreadId);
        // Thread exists, but let's make sure participants and details are up to date 
        const existingDoc = querySnap.docs.find(d => d.id === activeThreadId) || 
                           (await getDoc(doc(db, "threads", activeThreadId)));
        
        const threadData = (existingDoc as any).data() as ChatThread;
        
        // Migration: Ensure current user is in participants list (handles parent UID changes)
        if (!threadData.participants.includes(user.uid)) {
          await updateDoc(doc(db, "threads", activeThreadId), {
            participants: arrayUnion(user.uid)
          });
        }

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

      // If no active thread, create a new one
      console.log("[useChat] Creating new thread...");
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
        clientId: targetClientId || undefined,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        archivedBy: []
      });

      return threadId;
    } catch (err) {
      console.error("[useChat] Error in createOrGetThread:", err);
      throw err;
    }
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