"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Search,
  RefreshCw,
  Sun,
  Moon,
  ChevronDown,
  Menu,
  User,
  Settings,
  LogOut,
  CalendarPlus
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useEventModal } from "@/context/EventModalContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { NotificationBell, NotificationDropdown } from "@/components/notifications";

interface HeaderProps {
  onMenuClick?: () => void;
}

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/": { title: "Dashboard", subtitle: "DATE_PLACEHOLDER" },
  "/calendar": { title: "Calendar", subtitle: "DATE_PLACEHOLDER" }, // Calendar handles its own subtitle usually, but we'll stick to pattern
  "/clients": { title: "Clients", subtitle: "Manage your clinical roster and monitor progress" },
  "/team": { title: "Team Management", subtitle: "Manage therapists, roles, and permissions" },
  "/billing": { title: "Billing", subtitle: "Invoices and financial overview" },
  "/analytics": { title: "Analytics", subtitle: "Performance metrics and insights" },
  "/settings": { title: "Settings", subtitle: "System preferences" },
};

export default function Header({ onMenuClick }: HeaderProps) {
  const pathname = usePathname();
  const [theme, setTheme] = useState("light");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, userData, signOut } = useAuth();
  const { openModal } = useEventModal();
  const { open: openCommandPalette } = useCommandPalette();
  
  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }));

    const storedTheme = localStorage.getItem("theme");
    if (storedTheme) {
      setTheme(storedTheme);
      document.documentElement.setAttribute("data-theme", storedTheme);
      if (storedTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  // Determine Title & Subtitle
  // Handle dynamic routes like /clients/[id] later if needed, for now exact match or fallback
  let pageInfo = PAGE_TITLES[pathname];
  
  if (!pageInfo) {
    // Basic fallback for dynamic routes
    if (pathname.startsWith("/clients/")) {
      // Profile header is handled INSIDE the page for Clients/[id] usually, 
      // but if we want it in top bar:
      pageInfo = { title: "Client Profile", subtitle: "View details and progress" };
    } else {
      pageInfo = { title: "TempoApp", subtitle: "Therapy Management" };
    }
  }

  // Override subtitle for date-based pages
  const displaySubtitle = pageInfo.subtitle === "DATE_PLACEHOLDER" ? currentDate : pageInfo.subtitle;

  return (
    <header className="sticky top-0 h-16 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 z-20 flex items-center justify-between px-4 lg:px-6">
      
      {/* Left: Mobile Menu Trigger */}
      <div className="flex items-center gap-3 lg:hidden">
        <button 
          onClick={onMenuClick}
          className="p-2 -ml-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Left: Page Title & Subtitle (Desktop) */}
      <div className="flex flex-col justify-center">
        <h2 className="font-semibold text-lg leading-tight text-neutral-900 dark:text-white">
          {pageInfo.title}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
          {displaySubtitle}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 ml-auto">
        
        {/* New Event Button (Only on Dashboard/Calendar) */}
        {(pathname === "/" || pathname === "/calendar") && (
          <button 
            onClick={() => openModal()}
            className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors font-medium text-sm mr-2 shadow-sm"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>New Event</span>
          </button>
        )}

        {/* Search */}
        <button
          onClick={openCommandPalette}
          className="flex items-center gap-2 p-2 md:px-3 md:py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Search className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline">Search...</span>
          <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-white dark:bg-neutral-600 rounded shadow-sm">⌘K</kbd>
        </button>

        {/* Refresh */}
        <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
          <RefreshCw className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
        </button>

        {/* Theme Toggle */}
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
        >
          {theme === "light" ? (
            <Moon className="w-5 h-5 text-neutral-600" />
          ) : (
            <Sun className="w-5 h-5 text-neutral-400" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <NotificationBell />
          <NotificationDropdown />
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button 
            onClick={toggleProfile}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium overflow-hidden shadow-sm"
              style={{ backgroundColor: userData?.photoURL ? 'transparent' : (userData?.color || '#4A90E2') }}
            >
              {userData?.photoURL ? (
                <img src={userData.photoURL} alt={userData.name} className="w-full h-full object-cover" />
              ) : (
                userData?.initials || user?.email?.[0].toUpperCase() || "U"
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-neutral-500 hidden sm:block" />
          </button>

          {isProfileOpen && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setIsProfileOpen(false)}
              ></div>
              <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-800 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
                  <p className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                    {user?.email || "User"}
                  </p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                    {user?.email || "user@example.com"}
                  </p>
                </div>
                
                <Link 
                  href="/settings" 
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <User className="w-4 h-4" />
                  <span>Profile</span>
                </Link>
                <Link 
                  href="/settings" 
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
                
                <div className="border-t border-neutral-200 dark:border-neutral-800 mt-1 pt-1">
                  <button 
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
