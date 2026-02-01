"use client";

import { useState } from "react";
import { useClients } from "@/hooks/useCollections";
import { EventFormData } from "./types";
import { Search, UserPlus, Check } from "lucide-react";
import { clsx } from "clsx";

interface StepClientsProps {
  data: EventFormData;
  updateData: (updates: Partial<EventFormData>) => void;
}

export default function StepClients({ data, updateData }: StepClientsProps) {
  const { data: clients } = useClients();
  const [search, setSearch] = useState("");

  const filteredClients = clients.filter(client => 
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleClient = (id: string) => {
    const current = data.selectedClients;
    const updated = current.includes(id)
      ? current.filter(c => c !== id)
      : [...current, id];
    updateData({ selectedClients: updated });
  };

  return (
    <div className="space-y-4">
      {/* Header & Search */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Select Clients
          </label>
          <button className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1">
            <UserPlus className="w-3 h-3" />
            Add New
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder="Search by name..." 
            className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 border rounded-lg focus:ring-2 focus:ring-primary-500 transition-colors text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Client List */}
      <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1">
        {filteredClients.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-sm">
            No clients found matching &quot;{search}&quot;
          </div>
        ) : (
          filteredClients.map(client => {
            const isSelected = data.selectedClients.includes(client.id);
            return (
              <div 
                key={client.id}
                onClick={() => toggleClient(client.id)}
                className={clsx(
                  "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all group",
                  isSelected
                    ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-primary-300 dark:hover:border-primary-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center font-semibold text-sm">
                    {client.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-neutral-900 dark:text-white">{client.name}</p>
                    <p className="text-xs text-neutral-500">Age: {client.age} • {client.medicalInfo || 'No notes'}</p>
                  </div>
                </div>
                
                <div className={clsx(
                  "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                  isSelected
                    ? "bg-primary-500 border-primary-500 text-white"
                    : "border-neutral-300 dark:border-neutral-600 group-hover:border-primary-400"
                )}>
                  {isSelected && <Check className="w-3 h-3" />}
                </div>
              </div>
            );
          })
        )}
      </div>
      
      <p className="text-xs text-neutral-500 text-right">
        {data.selectedClients.length} selected
      </p>
    </div>
  );
}
