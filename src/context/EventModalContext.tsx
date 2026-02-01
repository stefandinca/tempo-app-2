"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import NewEventModal from "@/components/calendar/NewEventModal";

interface EventModalContextType {
  openModal: (options?: { date?: Date; time?: string; clientId?: string }) => void;
  closeModal: () => void;
}

const EventModalContext = createContext<EventModalContextType>({} as EventModalContextType);

export function EventModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<{ date?: Date; time?: string; clientId?: string }>({});

  const openModal = (options?: { date?: Date; time?: string; clientId?: string }) => {
    setInitialData(options || {});
    setIsOpen(true);
  };

  const closeModal = () => {
    setIsOpen(false);
    setInitialData({});
  };

  return (
    <EventModalContext.Provider value={{ openModal, closeModal }}>
      {children}
      <NewEventModal
        isOpen={isOpen}
        onClose={closeModal}
        onEventCreated={() => {
          // Trigger global refresh if needed, or just let real-time listeners handle it
          // Since we use Firestore onSnapshot in hooks, UI updates automatically!
        }}
        initialDate={initialData.date}
        initialTime={initialData.time}
        initialClientId={initialData.clientId}
      />
    </EventModalContext.Provider>
  );
}

export const useEventModal = () => useContext(EventModalContext);
