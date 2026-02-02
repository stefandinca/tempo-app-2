"use client";

import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import ClientCard, { Client } from "./ClientCard";
import { ClientCardSkeleton } from "@/components/ui/Skeleton";
import { Search, Plus, Filter, ArrowUpDown, Loader2, Users } from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";

interface ClientListProps {
  onAdd: () => void;
}

export default function ClientList({ onAdd }: ClientListProps) {
  // Use shared data context instead of individual hooks
  const { clients, teamMembers, events, activePlans, activePlansLoading } = useData();
  const loading = clients.loading || activePlansLoading;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [sortBy, setSortBy] = useState<'name' | 'recent'>('name');
  const { userRole } = useAuth();

  const filteredClients = useMemo(() => {
    let result = clients.data.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase())
    );

    if (statusFilter === 'active') {
      result = result.filter(c => !c.isArchived);
    } else if (statusFilter === 'archived') {
      result = result.filter(c => c.isArchived);
    }

    if (sortBy === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      // Assuming we have a createdAt or similar
      result.sort((a, b) => (b.id.localeCompare(a.id))); // Fallback for now
    }

    return result;
  }, [clients.data, search, statusFilter, sortBy]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Toolbar */}
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
            <div className="w-full sm:w-80 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            <div className="w-48 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
            <div className="w-36 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            <div className="w-32 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
          </div>
        </div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ClientCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between">
        
        {/* Left: Search & Filter Segment */}
        <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
            {(['active', 'archived', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={clsx(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize",
                  statusFilter === status 
                    ? "bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sort & Add */}
        <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500 shadow-sm outline-none"
          >
            <option value="name">Sort by Name</option>
            <option value="recent">Sort by Recent</option>
          </select>

          {(userRole === 'Admin' || userRole === 'Coordinator') && (
            <button 
              onClick={onAdd}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
            >
              <Plus className="w-4 h-4" />
              <span className="whitespace-nowrap">New Client</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {filteredClients.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No clients found</h3>
          <p className="text-neutral-500 max-w-xs mt-1">Try adjusting your search or filters to find what you&apos;re looking for.</p>
          {search && (
            <button 
              onClick={() => setSearch("")}
              className="mt-4 text-primary-600 font-bold hover:underline"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-500">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              teamMembers={teamMembers.data}
              events={events.data}
              activePlan={activePlans[client.id] || null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
