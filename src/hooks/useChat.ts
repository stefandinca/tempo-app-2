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

    // For parents, use stable clientId to check archive status (anonymous UID changes each session)
    const archiveKey = (isParent && clientId) ? clientId : user.uid;

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threadList: ChatThread[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as ChatThread;
        // Only show if not archived by this user
        if (!data.archivedBy?.includes(archiveKey)) {
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

export function useArchivedThreads(enabled: boolean = true) {
  const { user, isParent, clientId } = useAnyAuth();
  const [archivedThreads, setArchivedThreads] = useState<ChatThread[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Don't run query if not enabled (e.g., user hasn't clicked "Archived" tab yet)
    if (!enabled || !user) {
      setLoading(false);
      setArchivedThreads([]);
      return;
    }

    setLoading(true);

    // Query threads where current user has archived them
    // For parents, use stable clientId as archive key (anonymous UID changes each session)
    const archiveKey = (isParent && clientId) ? clientId : user.uid;
    const q = (isParent && clientId)
      ? query(
          collection(db, "threads"),
          where("clientId", "==", clientId),
          where("archivedBy", "array-contains", archiveKey),
          orderBy("updatedAt", "desc")
        )
      : query(
          collection(db, "threads"),
          where("archivedBy", "array-contains", archiveKey),
          orderBy("updatedAt", "desc")
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threadList: ChatThread[]= [];
      snapshot.forEach((doc) => {
        threadList.push({ id: doc.id, ...doc.data() } as ChatThread);
      });
      setArchivedThreads(threadList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [enabled, user, isParent, clientId]);

  return { archivedThreads, loading };
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

    // Build message data - only include senderClientId for parent messages
    const messageData: any = {
      senderId: user.uid,
      text: text.trim(),
      timestamp: serverTimestamp(),
      type: 'text',
      // Add role-based attribution to fix message display after parent re-login
      senderRole: isParent ? 'parent' as const : 'staff' as const
    };

    // Only include senderClientId for parent messages (Firestore doesn't allow undefined)
    if (isParent && clientId) {
      messageData.senderClientId = clientId;
    }

    // 1. Add message to subcollection
    await addDoc(collection(db, "threads", threadId, "messages"), messageData);

    // 2. Update thread's last message and updatedAt, and bring the conversation
    //    back for EVERYONE.
    //
    //    This used to remove only the sender from archivedBy, leaving the
    //    recipient archived. The effect was that archiving a thread was
    //    permanent from the archiver's side: the other party kept replying,
    //    those replies were never surfaced, and because createOrGetThread
    //    returns the existing deterministic thread rather than making a new
    //    one, starting a fresh conversation with that person was impossible
    //    too. Archiving one conversation silently ended contact.
    //
    //    A new message means the conversation is live again, so it should
    //    reappear for whoever archived it — the same thing a mailbox does when
    //    a filed thread gets a reply. Archiving stays a way to tidy a finished
    //    conversation, not a way to stop hearing from someone.
    await updateDoc(doc(db, "threads", threadId), {
      lastMessage: {
        text: text.trim(),
        senderId: user.uid,
        timestamp: serverTimestamp(),
        readBy: [(isParent && clientId) ? clientId : user.uid]
      },
      updatedAt: serverTimestamp(),
      archivedBy: []
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

          // Only include clientId if RECIPIENT is parent (not sender)
          // This prevents parents from seeing notifications meant for staff.
          // Detected by clientId rather than by role, because role is a
          // translated display string here — see the note in createOrGetThread.
          const recipientIsParent = !!otherUser.clientId;
          const notificationClientId = recipientIsParent
            ? (threadData.clientId || otherUser.clientId)
            : undefined;

          await notifyMessageReceived(
            otherParticipantId,
            otherUser.role.toLowerCase() as NotificationRecipientRole,
            {
              senderName,
              text: text.trim(),
              threadId,
              triggeredByUserId: user.uid,
              clientId: notificationClientId
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

    // Keyed off clientId, NOT off role. NewChatModal sets a participant's role
    // from t("chat.role_parent"), so on a Romanian UI it reads "Părinte" and a
    // comparison against the literal 'Parent' silently fails — the thread then
    // gets no clientId, and parents list their threads by clientId precisely
    // because their anonymous uid changes every session. The result was a
    // thread the parent could never see, created without an error.
    // Only parent participants carry clientId, so its presence is the reliable
    // signal and it does not depend on the display language.
    const targetClientId = isParent ? (parentAuth?.clientId || "") : (otherUser.clientId || "");

    console.log("[useChat] Starting chat with:", otherUser.id, "role:", otherUser.role, "targetClientId:", targetClientId);

    let threadId: string = "";
    try {
      // Generate deterministic thread ID to prevent duplicates
      
      if (targetClientId) {
        // Parent-Staff chat: Use clientId + staffId (sorted)
        const staffId = isParent ? otherUser.id : user.uid;
        const ids = [targetClientId, staffId].sort();
        threadId = `thread_${ids[0]}_${ids[1]}`;
      } else {
        // Staff-Staff chat: Use both user IDs (sorted alphabetically)
        const ids = [user.uid, otherUser.id].sort();
        threadId = `thread_${ids[0]}_${ids[1]}`;
      }

      console.log("[useChat] Deterministic thread ID:", threadId);

      // Check if thread already exists
      const threadRef = doc(db, "threads", threadId);
      const threadSnap = await getDoc(threadRef);

      // Prepare current user participant details
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

      if (threadSnap.exists()) {
        console.log("[useChat] Found existing thread:", threadId);
        const threadData = threadSnap.data() as ChatThread;

        // Update participant details if needed (handles parent UID changes, updated info)
        const myDetails = threadData?.participantDetails[user.uid];
        const otherDetailsInThread = threadData?.participantDetails[otherUser.id];

        const updates: any = {};
        let needsUpdate = false;

        // Ensure current user is in participants array
        if (!threadData.participants.includes(user.uid)) {
          updates.participants = arrayUnion(user.uid);
          needsUpdate = true;
        }

        // Deliberately opening this conversation is itself an un-archive.
        // Thread ids are deterministic, so "start a chat" with someone you have
        // archived returns this thread rather than creating another one — and
        // without this the caller got back an id that their own sidebar filters
        // out, which reads as the button doing nothing.
        const myArchiveKey = (isParent && clientId) ? clientId : user.uid;
        if ((threadData.archivedBy || []).includes(myArchiveKey)) {
          updates.archivedBy = arrayRemove(myArchiveKey);
          needsUpdate = true;
        }

        // Update current user's details if missing or outdated
        if (!myDetails || myDetails.name === "Unknown" || myDetails.name === "Staff Member" ||
            (isParent && myDetails.name === "Parent") || !myDetails.phone) {
          updates[`participantDetails.${user.uid}`] = currentUserParticipant;
          needsUpdate = true;
        }

        // Update other user's details if we have more info
        if (otherUser.phone && (!otherDetailsInThread?.phone || !otherDetailsInThread?.clientId)) {
          updates[`participantDetails.${otherUser.id}.phone`] = otherUser.phone;
          if (otherUser.clientId) {
            updates[`participantDetails.${otherUser.id}.clientId`] = otherUser.clientId;
          }
          needsUpdate = true;
        }

        if (needsUpdate) {
          await updateDoc(threadRef, updates);
        }

        return threadId;
      }

      // Thread doesn't exist - create it with deterministic ID
      console.log("[useChat] Creating new thread with ID:", threadId);

      // Always include both users in participants array for consistent display
      // Even if parent hasn't logged in yet, including their ID (or clientId placeholder)
      // allows the thread to display correctly. Parent access is still controlled by
      // Firestore rules via isParent(clientId) check.
      const initialParticipants = [user.uid, otherUser.id];

      // Firestore rejects `undefined` outright, and ChatParticipant has three
      // optional fields, so a caller-supplied participant carrying an explicit
      // `undefined` fails the whole write. Dropping absent keys is what the
      // document should have looked like anyway.
      const withoutUndefined = <T extends Record<string, any>>(o: T): T =>
        Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

      const threadData: Record<string, any> = {
        participants: initialParticipants,
        participantDetails: {
          [user.uid]: withoutUndefined(currentUserParticipant),
          [otherUser.id]: withoutUndefined(otherUser)
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        archivedBy: []
      };

      // Omit the field entirely rather than writing undefined. This used to be
      // `clientId: targetClientId || undefined`, which threw on every
      // staff-to-staff thread — targetClientId is "" whenever the other party
      // is not a parent, and "" || undefined is undefined. Threads without a
      // clientId are legitimate and 28 of them already exist; they simply have
      // no field, which is what the rules test for.
      if (targetClientId) threadData.clientId = targetClientId;

      await setDoc(threadRef, threadData);

      return threadId;
    } catch (err: any) {
      console.error("[useChat] Error in createOrGetThread:", err);
      console.error("[useChat] Error code:", err?.code);
      console.error("[useChat] Error message:", err?.message);
      console.error("[useChat] Thread ID attempted:", threadId);
      console.error("[useChat] Participants:", [user.uid, otherUser.id]);
      console.error("[useChat] ClientId:", targetClientId);
      throw err;
    }
  };

  const archiveThread = async (threadId: string) => {
    if (!user) return;
    // For parents, use stable clientId so archive persists across anonymous sessions
    const archiveKey = (isParent && clientId) ? clientId : user.uid;
    await updateDoc(doc(db, "threads", threadId), {
      archivedBy: arrayUnion(archiveKey)
    });
  };

  const unarchiveThread = async (threadId: string) => {
    if (!user) return;
    const archiveKey = (isParent && clientId) ? clientId : user.uid;
    await updateDoc(doc(db, "threads", threadId), {
      archivedBy: arrayRemove(archiveKey)
    });
  };

  const markAsRead = async (threadId: string) => {
    if (!user) return;
    // For parents, use stable clientId so read status persists across anonymous sessions
    const readKey = (isParent && clientId) ? clientId : user.uid;
    await updateDoc(doc(db, "threads", threadId), {
      "lastMessage.readBy": arrayUnion(readKey)
    });
  };

  return { sendMessage, createOrGetThread, markAsRead, archiveThread, unarchiveThread };
}