# Internal Messaging System - Development Plan

## 1. Executive Summary
**Objective:** Implement a secure, real-time internal messaging system to facilitate collaboration between team members (Therapists, Admins, Staff) without leaving the TempoApp ecosystem.

**Core Philosophy:** "Instant & Contextual." The messaging experience must feel native (like WhatsApp/iMessage) and strictly adhere to the project's Privacy-First approach (secure Firestore rules).

## 2. User Stories (MVP)
1.  **Start a Conversation:** As a user, I want to select a colleague from the team list and start a private (1:1) chat.
2.  **Real-Time Communication:** As a user, I want to send and receive text messages instantly without refreshing the page.
3.  **Thread List:** As a user, I want to see a sorted list of my active conversations, with the most recent activity at the top.
4.  **Unread Indicators:** As a user, I want to see a visual cue (badge) when I have unread messages.
5.  **Mobile Experience:** As a mobile user, I want a responsive layout where the chat list and chat view handle small screens gracefully (Slide-over or separate pages).

## 3. UI/UX Design Strategy

### Layout Structure
*   **Desktop/Tablet:** Split View (Master-Detail).
    *   **Left Sidebar (30%):** Search bar, List of active threads (Avatar + Name + Truncated Last Message + Time).
    *   **Right Panel (70%):** Active conversation header, Scrollable message area (bubbles), Input area (Text + Send Button).
*   **Mobile:** Stacked View.
    *   **Index:** List of threads. Tapping one slides the Chat View into focus.

### Visual Hierarchy & Components
*   **Message Bubbles:**
    *   *Me:* Brand color background (Primary-500), White text, Right aligned.
    *   *Them:* Neutral background (Neutral-100/800), Dark text, Left aligned.
*   **Empty State:** Friendly illustration when no chat is selected.
*   **Optimistic UI:** When sending, the message appears immediately with a "sending..." opacity state until confirmed by Firestore.

## 4. Technical Architecture (Firebase & Next.js)

### Database Schema (Firestore)
We will use a top-level `threads` collection to manage relationships and `messages` subcollections for data scalability.

**Collection: `threads`**
*   `id` (auto-gen)
*   `participants` (Array<string>): `['uid1', 'uid2']` (Used for security rules & querying).
*   `participantDetails` (Map): Cache names/avatars to avoid joining client-side queries.
    *   `uid1`: { name: "Dr. Smith", photo: "url" }
    *   `uid2`: { name: "Sarah", photo: "url" }
*   `lastMessage` (Map):
    *   `text`: string (truncated)
    *   `senderId`: string
    *   `timestamp`: serverTimestamp
    *   `readBy`: Array<string> (active participants who saw the update)
*   `updatedAt`: serverTimestamp (for sorting)

**Subcollection: `threads/{threadId}/messages`**
*   `id` (auto-gen)
*   `senderId`: string
*   `text`: string
*   `timestamp`: serverTimestamp
*   `type`: 'text' | 'system' (future proofing)

### Data Access Strategy
*   **Hook:** `useThreads()`
    *   Query: `collection('threads').where('participants', 'array-contains', currentUser.uid).orderBy('updatedAt', 'desc')`
*   **Hook:** `useMessages(threadId)`
    *   Query: `collection('threads', threadId, 'messages').orderBy('timestamp', 'asc').limitToLast(50)`
*   **Security Rules:**
    *   Read/Write allowed ONLY if `request.auth.uid` is in `resource.data.participants`.

## 5. Implementation Phases

### Phase 1: The Core (MVP)
*   Create Firestore schema and generic `useChat` hooks.
*   Build `ChatLayout`, `ThreadList`, and `MessageBubble` components.
*   Implement 1:1 creation flow (Select Team Member -> Check if thread exists -> Create or Open).

### Phase 2: Polish & Notifications
*   Implement "Unread" badges in the sidebar.
*   Add "Typing..." indicators (Realtime Database presence or Firestore ephemeral writes).
*   Browser Notifications (FCM).

### Phase 3: Contextual Features (Future)
*   Link a Client Profile or Session Event in a chat.
*   Group Chats (Requires schema update to `participants` logic).

## 6. Development Checklist
- [ ] Create `src/types/chat.ts` definitions.
- [ ] Update `firestore.rules` for the `threads` collection.
- [ ] Create `useChat` hook in `src/hooks/useChat.ts`.
- [ ] Build UI Components in `src/components/chat/`.
- [ ] Create Page Route `src/app/(dashboard)/messages/page.tsx`.
