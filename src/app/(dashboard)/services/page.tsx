"use client";

import { useState, useEffect } from "react";
import ServiceList from "@/components/services/ServiceList";
import AddServiceModal from "@/components/services/AddServiceModal";
import EditServiceModal from "@/components/services/EditServiceModal";
import { Service } from "@/components/services/ServiceCard";
import ProgramList from "@/components/programs/ProgramList";
import AddProgramModal from "@/components/programs/AddProgramModal";
import EditProgramModal from "@/components/programs/EditProgramModal";
import { Program } from "@/components/programs/ProgramCard";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

type Tab = "services" | "programs";

export default function ServicesPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>("services");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isAddProgramModalOpen, setIsAddProgramModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Check for pending action from command palette
  useEffect(() => {
    const action = sessionStorage.getItem("commandPaletteAction");
    if (action === "add-service") {
      sessionStorage.removeItem("commandPaletteAction");
      setTimeout(() => setIsAddModalOpen(true), 100);
    }
  }, []);

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Tab Toggle */}
      <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
        {(["services", "programs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              "px-5 py-2 text-sm font-bold rounded-lg transition-all capitalize",
              activeTab === tab
                ? "bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            {t(`services_page.tabs.${tab}`)}
          </button>
        ))}
      </div>

      {/* Services Tab */}
      {activeTab === "services" && (
        <>
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
        </>
      )}

      {/* Programs Tab */}
      {activeTab === "programs" && (
        <>
          <ProgramList
            onAdd={() => setIsAddProgramModalOpen(true)}
            onEdit={(program) => setEditingProgram(program)}
          />

          <AddProgramModal
            isOpen={isAddProgramModalOpen}
            onClose={() => setIsAddProgramModalOpen(false)}
          />

          <EditProgramModal
            isOpen={!!editingProgram}
            program={editingProgram}
            onClose={() => setEditingProgram(null)}
          />
        </>
      )}
    </div>
  );
}
