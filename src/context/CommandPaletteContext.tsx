"use client";

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

interface CommandPaletteContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  // Action triggers for pages to respond to
  pendingAction: string | null;
  clearPendingAction: () => void;
  setPendingAction: (action: string) => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextType>({} as CommandPaletteContextType);

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingActionState] = useState<string | null>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);
  const clearPendingAction = useCallback(() => setPendingActionState(null), []);
  const setPendingAction = useCallback((action: string) => setPendingActionState(action), []);

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggle, close]);

  return (
    <CommandPaletteContext.Provider value={{
      isOpen,
      open,
      close,
      toggle,
      pendingAction,
      clearPendingAction,
      setPendingAction
    }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}

export const useCommandPalette = () => useContext(CommandPaletteContext);
