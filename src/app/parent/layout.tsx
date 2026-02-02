"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  BarChart2,
  FileText,
  LogOut,
  CreditCard,
  Bell
} from "lucide-react";
import { clsx } from "clsx";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: "Home", href: `/parent/dashboard/`, icon: Home },
    { name: "Schedule", href: `/parent/schedule/`, icon: Calendar },
    { name: "Progress", href: `/parent/progress/`, icon: BarChart2 },
    { name: "Billing", href: `/parent/billing/`, icon: CreditCard },
    { name: "Docs", href: `/parent/docs/`, icon: FileText },
  ];

  const handleSignOut = () => {
    localStorage.removeItem("parent_client_code");
    localStorage.removeItem("parent_client_id");
    localStorage.removeItem("parent_client_name");
    router.push("/parent/");
  };

  // If we are on the landing page, just show children without the portal shell
  const isLandingPage = pathname === "/parent" || pathname === "/parent/" || pathname.endsWith("/parent") || pathname.endsWith("/parent/");
  
  if (isLandingPage) return <>{children}</>;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20 lg:pb-0 lg:pl-20 font-sans">
      
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">T</span>
            </div>
            <span className="font-bold text-neutral-900 dark:text-white text-sm">Tempo Portal</span>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/parent/schedule/"
              className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full" />
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto lg:max-w-4xl lg:py-8 lg:px-6 min-h-[calc(100vh-120px)] lg:min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-2 py-2 lg:hidden">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all",
                  isActive 
                    ? "text-primary-600 dark:text-primary-400" 
                    : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                <item.icon className={clsx("w-6 h-6", isActive && "fill-current")} />
                <span className="text-[10px] font-medium uppercase tracking-wide">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Navigation (Desktop) */}
      <nav className="fixed left-0 top-0 bottom-0 w-20 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 hidden lg:flex flex-col items-center py-8 gap-8">
        <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center mb-4">
          <span className="text-white font-bold text-xl">T</span>
        </div>
        
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                "p-3 rounded-2xl transition-all group relative",
                isActive
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {item.name}
              </span>
            </Link>
          );
        })}

        <div className="mt-auto flex flex-col items-center gap-2">
          <Link
            href="/parent/schedule/"
            className="p-3 text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white rounded-2xl transition-all group relative"
          >
            <Bell className="w-6 h-6" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-error-500 rounded-full" />
            <span className="absolute left-full ml-4 px-2 py-1 bg-neutral-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
              Notifications
            </span>
          </Link>
          <button
            onClick={handleSignOut}
            className="p-3 text-neutral-400 hover:bg-error-50 dark:hover:bg-error-900/20 hover:text-error-600 rounded-2xl transition-all"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </div>
  );
}