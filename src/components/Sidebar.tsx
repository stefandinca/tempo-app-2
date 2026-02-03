"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Users,
  UserCircle,
  CreditCard,
  BarChart2,
  Settings,
  Search,
  Briefcase
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar/", icon: Calendar },
  { name: "Clients", href: "/clients/", icon: Users, badge: 48 },
  { name: "Team", href: "/team/", icon: UserCircle },
];

const adminItems = [
  { name: "Billing", href: "/billing/", icon: CreditCard, roles: ['Admin'] },
  { name: "Analytics", href: "/analytics/", icon: BarChart2, roles: ['Admin', 'Coordinator'] },
  { name: "Services", href: "/services/", icon: Briefcase, roles: ['Admin', 'Coordinator'] },
  { name: "Settings", href: "/settings/", icon: Settings, roles: ['Admin'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { userRole } = useAuth();
  const { open: openCommandPalette } = useCommandPalette();

  // Don't show regular sidebar for parents (they use a different shell or portal view)
  if (userRole === 'Parent') return null;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-40 hidden lg:block">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">T</span>
        </div>
        <div>
          <h1 className="font-bold text-lg text-neutral-900 dark:text-white">TempoApp</h1>
          <p className="text-xs text-neutral-500">Therapy Management</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
              {item.badge && (
                <span className="ml-auto px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-400 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {(userRole === 'Admin' || userRole === 'Coordinator') && (
          <>
            <div className="pt-6 pb-2">
              <p className="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
                Management
              </p>
            </div>

            {adminItems
              .filter(item => item.roles.includes(userRole as string))
              .map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                        : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
          </>
        )}
      </nav>

      {/* Search Hint */}
      <div className="absolute bottom-6 left-4 right-4">
        <button
          onClick={openCommandPalette}
          className="w-full flex items-center gap-2 px-3 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span>Search...</span>
          <kbd className="ml-auto px-1.5 py-0.5 text-xs bg-white dark:bg-neutral-600 rounded shadow-sm border border-neutral-200 dark:border-neutral-700">
            ⌘K
          </kbd>
        </button>
      </div>
    </aside>
  );
}
