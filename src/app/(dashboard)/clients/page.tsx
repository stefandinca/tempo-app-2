"use client";

import { useState, useEffect } from "react";
import ClientList from "@/components/clients/ClientList";
import AddClientModal from "@/components/clients/AddClientModal";

export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Check for pending action from command palette
  useEffect(() => {
    const action = sessionStorage.getItem("commandPaletteAction");
    if (action === "add-client") {
      sessionStorage.removeItem("commandPaletteAction");
      // Small delay to ensure component is mounted
      setTimeout(() => setIsModalOpen(true), 100);
    }
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6">
      <ClientList onAdd={() => setIsModalOpen(true)} />

      <AddClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}