"use client";

import { useClients, useTeamMembers, useServices } from "@/hooks/useCollections";
import { X, Search, Check } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export interface FilterState {
  therapists: string[]; // IDs
  clients: string[];    // IDs
  eventTypes: string[]; // Service IDs
}

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (newFilters: FilterState) => void;
}

export default function FilterPanel({ isOpen, onClose, filters, onFilterChange }: FilterPanelProps) {
  const { t } = useTranslation();
  const { data: clients } = useClients();
  const { data: teamMembers } = useTeamMembers();
  const { data: services } = useServices();
  const [clientSearch, setClientSearch] = useState("");

  const handleToggle = (category: keyof FilterState, value: string) => {
    const current = filters[category];
    const updated = current.includes(value)
      ? current.filter(item => item !== value)
      : [...current, value];
    
    onFilterChange({
      ...filters,
      [category]: updated
    });
  };

  const clearFilters = () => {
    onFilterChange({
      therapists: [],
      clients: [],
      eventTypes: []
    });
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  );

  return (
    <>
      {/* Overlay */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-80 bg-white dark:bg-neutral-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-neutral-200 dark:border-neutral-800",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">{t('calendar.filters.title')}</h3>
          <div className="flex items-center gap-2">
            <button 
              onClick={clearFilters}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              {t('calendar.filters.clear')}
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <X className="w-5 h-5 text-neutral-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6 overflow-y-auto h-[calc(100vh-4rem)]">
          
          {/* Team Members */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">{t('calendar.filters.therapists')}</h4>
            <div className="space-y-2">
              {teamMembers.map(member => (
                <label 
                  key={member.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                >
                  <div className={clsx(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    filters.therapists.includes(member.id) 
                      ? "bg-primary-500 border-primary-500 text-white" 
                      : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                  )}>
                    {filters.therapists.includes(member.id) && <Check className="w-3 h-3" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={filters.therapists.includes(member.id)}
                    onChange={() => handleToggle('therapists', member.id)}
                  />
                  <div 
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs text-white font-medium"
                    style={{ backgroundColor: member.color || '#ccc' }}
                  >
                    {member.initials}
                  </div>
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{member.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Service Types */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">{t('calendar.filters.event_types')}</h4>
            <div className="space-y-2">
              {services.map(service => (
                <label
                  key={service.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                >
                  <div className={clsx(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    filters.eventTypes.includes(service.id)
                      ? "bg-primary-500 border-primary-500 text-white"
                      : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                  )}>
                    {filters.eventTypes.includes(service.id) && <Check className="w-3 h-3" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={filters.eventTypes.includes(service.id)}
                    onChange={() => handleToggle('eventTypes', service.id)}
                  />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{service.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Clients */}
          <div>
            <h4 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">{t('calendar.filters.clients')}</h4>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder={t('common.search')} 
                className="w-full pl-9 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
              />
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {filteredClients.map(client => (
                <label 
                  key={client.id} 
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
                >
                  <div className={clsx(
                    "w-5 h-5 rounded border flex items-center justify-center transition-colors",
                    filters.clients.includes(client.id) 
                      ? "bg-primary-500 border-primary-500 text-white" 
                      : "border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800"
                  )}>
                    {filters.clients.includes(client.id) && <Check className="w-3 h-3" />}
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={filters.clients.includes(client.id)}
                    onChange={() => handleToggle('clients', client.id)}
                  />
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{client.name}</span>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
