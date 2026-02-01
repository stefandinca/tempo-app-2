"use client";

import { ArrowLeft, Edit, MoreVertical } from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";

interface ClientProfileHeaderProps {
  clientName: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "evolution", label: "Evolution" },
  { id: "programs", label: "Programs" },
  { id: "plan", label: "Plan" },
  { id: "docs", label: "Docs" },
  { id: "reports", label: "Reports" },
];

export default function ClientProfileHeader({ clientName, activeTab, onTabChange }: ClientProfileHeaderProps) {
  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link 
            href="/clients"
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Link>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{clientName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm font-medium">
            <Edit className="w-4 h-4" />
            Edit Profile
          </button>
          <button className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <MoreVertical className="w-5 h-5 text-neutral-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto scrollbar-hide">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={clsx(
              "px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap",
              activeTab === tab.id
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
