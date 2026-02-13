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
  CalendarPlus,
  WifiOff
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/context/AuthContext";
import { useEventModal } from "@/context/EventModalContext";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { NotificationBell, NotificationDropdown } from "@/components/notifications";
import { useConnectivity } from "@/hooks/useConnectivity";
import { useToast } from "@/context/ToastContext";

import { useTranslation } from "react-i18next";

interface HeaderProps {
  onMenuClick?: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [theme, setTheme] = useState("light");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, userData, signOut } = useAuth();
  const { openModal } = useEventModal();
  const { open: openCommandPalette } = useCommandPalette();
  const isOnline = useConnectivity();
  const { warning, success: toastSuccess } = useToast();
  
  const [currentDate, setCurrentDate] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = () => {
    if (!isOnline) {
      warning(t('header.offline_warning'));
      return;
    }

    setIsRefreshing(true);
    // Simulate data refresh - in a real app this might trigger a revalidate or context refresh
    setTimeout(() => {
      setIsRefreshing(false);
      toastSuccess(t('header.refresh_success'));
    }, 1500);
  };

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
  const getPageInfo = () => {
    const normalizedPath = pathname.endsWith('/') && pathname !== '/' 
      ? pathname.slice(0, -1) 
      : pathname;

    if (normalizedPath === "/") return { title: t('header.titles.dashboard'), subtitle: "DATE_PLACEHOLDER" };
    if (normalizedPath === "/calendar") return { title: t('header.titles.calendar'), subtitle: "DATE_PLACEHOLDER" };
    if (normalizedPath === "/messages") return { title: t('header.titles.messages'), subtitle: t('header.titles.messages_subtitle') };
    
    if (normalizedPath.startsWith("/clients")) {
      if (normalizedPath === "/clients") return { title: t('header.titles.clients'), subtitle: t('header.titles.clients_subtitle') };
      return { title: t('header.titles.client_profile'), subtitle: t('header.titles.client_profile_subtitle') };
    }
    if (normalizedPath.startsWith("/team")) return { title: t('header.titles.team'), subtitle: t('header.titles.team_subtitle') };
    if (normalizedPath.startsWith("/billing")) return { title: t('header.titles.billing'), subtitle: t('header.titles.billing_subtitle') };
    if (normalizedPath.startsWith("/analytics")) return { title: t('header.titles.analytics'), subtitle: t('header.titles.analytics_subtitle') };
    if (normalizedPath.startsWith("/settings")) return { title: t('header.titles.settings'), subtitle: t('header.titles.settings_subtitle') };
    
    return { title: t('header.titles.app_title'), subtitle: t('header.titles.app_subtitle') };
  };

  const pageInfo = getPageInfo();
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
        <h2 className="font-semibold text-lg leading-tight text-neutral-900 dark:text-white font-display">
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
            <span>{t('header.new_event')}</span>
          </button>
        )}

        {/* Search */}
        <button
          onClick={openCommandPalette}
          className="flex items-center gap-2 p-2 md:px-3 md:py-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-sm text-neutral-500 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Search className="w-5 h-5 md:w-4 md:h-4" />
          <span className="hidden md:inline">{t('header.search_placeholder')}</span>
          <kbd className="hidden md:inline px-1.5 py-0.5 text-xs bg-white dark:bg-neutral-600 rounded shadow-sm">⌘K</kbd>
        </button>

        {/* Connectivity / Refresh */}
        <button 
          onClick={handleRefresh}
          className={clsx(
            "p-2 rounded-lg transition-colors flex items-center gap-2",
            isOnline 
              ? "hover:bg-neutral-100 dark:hover:bg-neutral-800" 
              : "bg-error-50 dark:bg-error-900/20 text-error-600 hover:bg-error-100 dark:hover:bg-error-900/30"
          )}
          title={isOnline ? t('header.refresh_tooltip') : t('header.offline_tooltip')}
        >
          {isOnline ? (
            <RefreshCw className={clsx("w-5 h-5 text-neutral-600 dark:text-neutral-400", isRefreshing && "animate-spin text-primary-500")} />
          ) : (
            <WifiOff className="w-5 h-5" />
          )}
          {!isOnline && <span className="text-xs font-bold hidden md:inline">{t('header.offline')}</span>}
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
                  <span>{t('header.profile')}</span>
                </Link>
                <Link 
                  href="/settings" 
                  onClick={() => setIsProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span>{t('header.titles.settings')}</span>
                </Link>
                
                <div className="border-t border-neutral-200 dark:border-neutral-800 mt-1 pt-1">
                  <button 
                    onClick={() => signOut()}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>{t('header.sign_out')}</span>
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
