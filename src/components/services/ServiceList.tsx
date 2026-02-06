"use client";

import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import ServiceCard, { Service } from "./ServiceCard";
import { ServiceCardSkeleton } from "@/components/ui/Skeleton";
import { Search, Plus, Loader2, Briefcase } from "lucide-react";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";

interface ServiceListProps {
  onAdd: () => void;
  onEdit: (service: Service) => void;
}

export default function ServiceList({ onAdd, onEdit }: ServiceListProps) {
  const { t } = useTranslation();
  const { services: servicesState } = useData();
  const loading = servicesState.loading;
  const services = servicesState.data as Service[];
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('services.title')}</h1>
            <p className="text-sm text-neutral-500 mt-1">
              {t('services.subtitle')}
            </p>
          </div>
        </div>
        {/* Skeleton Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="w-full sm:w-72 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
            <div className="w-56 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
          </div>
          <div className="w-32 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
        </div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('services.title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">
            {t('services.subtitle')}
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
              placeholder={t('services.search_placeholder')}
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
                {t(`services.${status.replace('-', '_')}`)}
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
          <span>{t('services.new_service')}</span>
        </button>
      </div>

      {/* Grid */}
      {filteredServices.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-4">
            <Briefcase className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t('services.no_results')}
          </h3>
          <p className="text-neutral-500 max-w-xs mt-1">
            {search
              ? t('services.no_results_subtitle')
              : t('services.no_services_yet')}
          </p>
          {search && (
            <button
              onClick={() => setSearch("")}
              className="mt-4 text-primary-600 font-bold hover:underline"
            >
              {t('services.clear_search')}
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
