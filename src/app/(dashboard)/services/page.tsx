"use client";

import { useState } from "react";
import ServiceList from "@/components/services/ServiceList";
import AddServiceModal from "@/components/services/AddServiceModal";
import EditServiceModal from "@/components/services/EditServiceModal";
import { Service } from "@/components/services/ServiceCard";

export default function ServicesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  return (
    <div className="flex-1 p-6 space-y-6">
      <ServiceList
        onAdd={() => setIsAddModalOpen(true)}
        onEdit={(service) => setEditingService(service)}
      />

      <AddServiceModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />

      <EditServiceModal
        isOpen={!!editingService}
        service={editingService}
        onClose={() => setEditingService(null)}
      />
    </div>
  );
}
