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
  Briefcase,
  MessageSquare,
  X
} from "lucide-react";
import { clsx } from "clsx";
import { useNotifications } from "@/context/NotificationContext";

interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Calendar", href: "/calendar/", icon: Calendar },
  { name: "Messages", href: "/messages/", icon: MessageSquare },
  { name: "Clients", href: "/clients/", icon: Users },
  { name: "Team", href: "/team/", icon: UserCircle },
];

const adminItems = [
  { name: "Billing", href: "/billing/", icon: CreditCard },
  { name: "Analytics", href: "/analytics/", icon: BarChart2 },
  { name: "Services", href: "/services/", icon: Briefcase },
  { name: "Settings", href: "/settings/", icon: Settings },
];

export default function MobileSidebar({ isOpen, onClose }: MobileSidebarProps) {
  const pathname = usePathname();
  const { unreadMessageCount } = useNotifications();

  return (
    <>
      {/* Backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Drawer */}
      <aside 
        className={clsx(
          "fixed left-0 top-0 h-full w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 z-50 transform transition-transform duration-300 ease-in-out lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">T</span>
            </div>
            <span className="font-bold text-lg text-neutral-900 dark:text-white">Tempo</span>
          </div>
          <button onClick={onClose} className="p-2 -mr-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="p-4 space-y-1 overflow-y-auto max-h-[calc(100vh-4rem)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            
            // Determine badge content
            let badgeContent = null;
            if (item.name === "Messages" && unreadMessageCount > 0) {
              badgeContent = unreadMessageCount;
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
                {badgeContent && (
                  <span className="ml-auto px-2 py-0.5 text-xs bg-error-100 dark:bg-error-900 text-error-600 dark:text-error-400 font-bold rounded-full">
                    {badgeContent}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-6 pb-2">
            <p className="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wide">
              Admin
            </p>
          </div>

          {adminItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
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
        </nav>
      </aside>
    </>
  );
}
