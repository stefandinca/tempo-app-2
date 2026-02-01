"use client";

import { useState } from "react";
import ClientList from "@/components/clients/ClientList";
import AddClientModal from "@/components/clients/AddClientModal";

export default function ClientsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

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