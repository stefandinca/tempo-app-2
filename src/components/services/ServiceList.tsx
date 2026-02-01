"use client";

import { useState, useMemo } from "react";
import { useServices } from "@/hooks/useCollections";
import ServiceCard, { Service } from "./ServiceCard";
import { Search, Plus, Loader2, Briefcase } from "lucide-react";
import { clsx } from "clsx";

interface ServiceListProps {
  onAdd: () => void;
  onEdit: (service: Service) => void;
}

export default function ServiceList({ onAdd, onEdit }: ServiceListProps) {
  const { data, loading } = useServices();
  const services = data as Service[];
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "billable" | "non-billable">("all");

  const filteredServices = useMemo(() => {
    let result = services.filter((s) =>
      s.label.toLowerCase().includes(search.toLowerCase())
    );

    if (filter === "billable") {
      result = result.filter((s) => s.isBillable);
    } else if (filter === "non-billable") {
      result = result.filter((s) => !s.isBillable);
    }

    // Sort alphabetically by label
    result.sort((a, b) => a.label.localeCompare(b.label));

    return result;
  }, [services, search, filter]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Services</h1>
          <p className="text-sm text-neutral-500 mt-1">
            Manage service types and pricing for your therapy center
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Left: Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search services..."
              className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-fit">
            {(["all", "billable", "non-billable"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={clsx(
                  "px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize whitespace-nowrap",
                  filter === status
                    ? "bg-white dark:bg-neutral-700 text-primary-600 dark:text-primary-400 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
              >
                {status === "non-billable" ? "Non-Billable" : status}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Add Button */}
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20"
        >
          <Plus className="w-4 h-4" />
          <span>New Service</span>
        </button>
      </div>

      {/* Grid */}
      {filteredServices.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            No services found
          </h3>
          <p className="text-neutral-500 max-w-xs mt-1">
            {search
              ? "Try adjusting your search or filters."
              : "Get started by adding your first service."}
          </p>
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
          {filteredServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={() => onEdit(service)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
