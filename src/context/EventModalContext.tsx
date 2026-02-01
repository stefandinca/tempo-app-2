"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import NewEventModal from "@/components/calendar/NewEventModal";

interface EventModalContextType {
  openModal: (date?: Date, time?: string) => void;
  closeModal: () => void;
}

const EventModalContext = createContext<EventModalContextType>({} as EventModalContextType);

export function EventModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [initialData, setInitialData] = useState<{ date?: Date; time?: string }>({});

  const openModal = (date?: Date, time?: string) => {
    setInitialData({ date, time });
    setIsOpen(true);
  };

  const closeModal = () => setIsOpen(false);

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
      />
    </EventModalContext.Provider>
  );
}

export const useEventModal = () => useContext(EventModalContext);
