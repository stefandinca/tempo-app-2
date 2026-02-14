"use client";

import { useState, useMemo } from "react";
import { 
  Search, 
  ChevronRight, 
  Book, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  ShieldCheck, 
  CreditCard, 
  BarChart3, 
  Settings,
  HelpCircle,
  ArrowLeft,
  BookOpen
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import Link from "next/link";

export default function HelpPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSection, setActiveSection] = useState("dashboard");

  const sections = [
    { id: "dashboard", icon: LayoutDashboard, color: "text-blue-500" },
    { id: "calendar", icon: Calendar, color: "text-primary-500" },
    { id: "clients", icon: Users, color: "text-teal-500" },
    { id: "team", icon: ShieldCheck, color: "text-purple-500" },
    { id: "billing", icon: CreditCard, color: "text-warning-500" },
    { id: "analytics", icon: BarChart3, color: "text-indigo-500" },
    { id: "settings", icon: Settings, color: "text-neutral-500" }
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections;
    
    // Simple filter based on title or content
    return sections.filter(section => {
      const title = t(`help.sections.${section.id}.title`).toLowerCase();
      const desc = t(`help.sections.${section.id}.description`).toLowerCase();
      return title.includes(searchQuery.toLowerCase()) || desc.includes(searchQuery.toLowerCase());
    });
  }, [searchQuery, t, sections]);

  return (
    <div className="flex-1 min-h-screen bg-neutral-50 dark:bg-black">
      {/* Search Header */}
      <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 z-10 px-6 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-500"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                <BookOpen className="w-8 h-8 text-primary-500" />
                {t('help.title')}
              </h1>
              <p className="text-neutral-500 mt-1">{t('help.subtitle')}</p>
            </div>
          </div>

          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
            <input 
              type="text"
              placeholder={t('help.search_placeholder')}
              className="w-full pl-12 pr-4 py-4 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-4 gap-10">
        {/* Sidebar Navigation */}
        <aside className="hidden lg:block space-y-1 sticky top-44 h-fit">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium",
                activeSection === section.id
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-neutral-500 hover:bg-white dark:hover:bg-neutral-900 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <section.icon className={clsx("w-5 h-5", activeSection === section.id ? section.color : "text-neutral-400")} />
              {t(`help.sections.${section.id}.title`)}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-12">
          {filteredSections.map((section) => (
            <section 
              key={section.id} 
              id={section.id}
              className={clsx(
                "scroll-mt-44 transition-opacity",
                activeSection !== section.id && searchQuery === "" && "lg:hidden"
              )}
            >
              <div className="flex items-center gap-4 mb-6">
                <div className={clsx("w-12 h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-neutral-900 shadow-sm border border-neutral-100 dark:border-neutral-800", section.color)}>
                  <section.icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">
                    {t(`help.sections.${section.id}.title`)}
                  </h2>
                  <p className="text-neutral-500">
                    {t(`help.sections.${section.id}.description`)}
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {/* Feature detail blocks - we'll iterate through the known feature keys for each section */}
                {Object.keys((t(`help.sections.${section.id}.features`, { returnObjects: true }) as any) || {}).map((featureKey) => (
                  <div 
                    key={featureKey}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                      {t(`help.sections.${section.id}.features.${featureKey}.title`)}
                    </h3>
                    <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed text-sm">
                      {t(`help.sections.${section.id}.features.${featureKey}.content`)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          {filteredSections.length === 0 && (
            <div className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
              <HelpCircle className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">No articles found</h3>
              <p className="text-neutral-500">Try adjusting your search query to find what you&apos;re looking for.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
