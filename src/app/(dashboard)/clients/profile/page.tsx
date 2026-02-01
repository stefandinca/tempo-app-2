"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useClient } from "@/hooks/useClient";
import ClientProfileHeader from "@/components/clients/ClientProfileHeader";
import ClientOverviewTab from "@/components/clients/ClientOverviewTab";
import ClientProgramsTab from "@/components/clients/ClientProgramsTab";
import EditClientModal from "@/components/clients/EditClientModal";
import { Loader2, AlertCircle } from "lucide-react";

function ClientProfileContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const { data: client, loading, error } = useClient(id || "");
  const [activeTab, setActiveTab] = useState("overview");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6">
        <AlertCircle className="w-12 h-12 text-error-500 mb-4" />
        <h2 className="text-xl font-bold">Invalid Request</h2>
        <p className="text-neutral-500 mt-2">No client ID provided.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-[80vh] text-center p-6">
        <div className="w-16 h-16 bg-error-50 dark:bg-error-900/20 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-error-500" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Client not found</h2>
        <p className="text-neutral-500 mt-2">The client you are looking for doesn&apos;t exist or has been removed.</p>
        <a href="/clients" className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700 transition-colors">
          Back to Client List
        </a>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-8 max-w-7xl mx-auto w-full">
      <ClientProfileHeader 
        client={client} 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onEdit={() => setIsEditModalOpen(true)} 
      />

      <div className="pt-2">
        {activeTab === "overview" && <ClientOverviewTab client={client} />}
        {activeTab === "programs" && <ClientProgramsTab client={client} />}
        {activeTab !== "overview" && activeTab !== "programs" && (
          <div className="py-20 text-center bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white capitalize">{activeTab} Section</h3>
            <p className="text-neutral-500 mt-1">This section is currently under development.</p>
          </div>
        )}
      </div>

      <EditClientModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        client={client}
      />
    </div>
  );
}

export default function ClientProfilePage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-primary-500" />
      </div>
    }>
      <ClientProfileContent />
    </Suspense>
  );
}