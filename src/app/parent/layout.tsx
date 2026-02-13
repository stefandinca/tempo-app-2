"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Calendar,
  BarChart2,
  MessageSquare,
  MoreHorizontal,
  CreditCard,
  FileText,
  User,
  BookOpen,
  LogOut,
  Loader2,
} from "lucide-react";
import { clsx } from "clsx";
import { signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useParentAuth } from "@/context/ParentAuthContext";
import { useNotifications } from "@/context/NotificationContext";
import { useHomework, useClientInvoices } from "@/hooks/useCollections";
import ParentNotificationBell from "@/components/notifications/ParentNotificationBell";
import ParentNotificationDropdown from "@/components/notifications/ParentNotificationDropdown";
import MoreSheet from "@/components/parent/MoreSheet";
import { useTranslation } from "react-i18next";

function ParentLayoutContent({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading, clientName, clientId } = useParentAuth();
  const { unreadMessageCount } = useNotifications();
  const [moreOpen, setMoreOpen] = useState(false);

  // Fetch homework and billing for notifications
  const { data: homework } = useHomework(clientId || "");
  const { data: invoices } = useClientInvoices(clientId || "");

  const incompleteHomeworkCount = useMemo(() => 
    homework.filter(h => !h.completed).length, 
  [homework]);

  const unpaidInvoiceCount = useMemo(() => 
    invoices.filter(i => i.status === 'pending' || i.status === 'create').length, 
  [invoices]);

  const moreHasNotification = incompleteHomeworkCount > 0 || unpaidInvoiceCount > 0;

  const childFirstName = useMemo(() => {
    if (!clientName) return "";
    return clientName.split(" ")[0];
  }, [clientName]);

  const childInitial = childFirstName ? childFirstName.charAt(0).toUpperCase() : "?";

  // Primary bottom nav items (5 max)
  const navItems = [
    { key: "home", href: "/parent/dashboard/", icon: Home, label: t("parent_nav.home") },
    { key: "schedule", href: "/parent/calendar/", icon: Calendar, label: t("parent_nav.schedule") },
    { key: "progress", href: "/parent/progress/", icon: BarChart2, label: t("parent_nav.progress") },
    { key: "messages", href: "/parent/messages/", icon: MessageSquare, label: t("parent_nav.messages") },
  ];

  // Desktop sidebar has all items
  const allNavItems = [
    ...navItems,
    { key: "billing", href: "/parent/billing/", icon: CreditCard, label: t("parent_nav.billing") },
    { key: "docs", href: "/parent/docs/", icon: FileText, label: t("parent_nav.docs") },
    { key: "profile", href: "/parent/profile/", icon: User, label: t("parent_nav.profile") },
    { key: "homework", href: "/parent/homework/", icon: BookOpen, label: t("parent_nav.homework") },
  ];

  const handleSignOut = useCallback(async () => {
    sessionStorage.removeItem("parent_client_code");
    sessionStorage.removeItem("parent_client_id");
    sessionStorage.removeItem("parent_client_name");
    sessionStorage.removeItem("parent_uid");

    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error("Error signing out:", err);
    }

    router.push("/parent/");
  }, [router]);

  const isLandingPage =
    pathname === "/parent" ||
    pathname === "/parent/" ||
    pathname.endsWith("/parent") ||
    pathname.endsWith("/parent/");

  useEffect(() => {
    if (isLandingPage || loading) return;
    if (!isAuthenticated) {
      router.replace("/parent/");
    }
  }, [isAuthenticated, loading, isLandingPage, router]);

  if (isLandingPage) return <>{children}</>;

  if (loading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const isActive = (href: string) => pathname === href;
  const isMoreActive = ["/parent/billing/", "/parent/docs/", "/parent/profile/", "/parent/homework/"].some(
    (h) => pathname === h
  );

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pb-20 lg:pb-0 lg:pl-56 font-sans">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-sm">{childInitial}</span>
            </div>
            <div>
              <span className="font-bold text-neutral-900 dark:text-white text-sm block leading-tight">
                {childFirstName || t("parent_nav.portal")}
              </span>
              <span className="text-[10px] text-neutral-400 leading-tight">
                {t("parent_nav.parent_portal")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 relative">
            <ParentNotificationBell />
            <ParentNotificationDropdown />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-lg mx-auto lg:max-w-4xl lg:py-8 lg:px-6 min-h-[calc(100vh-120px)] lg:min-h-screen">
        {children}
      </main>

      {/* Bottom Navigation (Mobile) - 5 tabs */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 px-2 py-2 lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const active = isActive(item.href);
            const isMessages = item.key === "messages";
            return (
              <Link
                key={item.key}
                href={item.href}
                className={clsx(
                  "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative",
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                <item.icon className={clsx("w-5 h-5", active && "fill-current")} />
                {isMessages && unreadMessageCount > 0 && (
                  <span className="absolute top-0.5 right-2 w-4 h-4 bg-error-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </span>
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* More Tab */}
          <button
            onClick={() => setMoreOpen(true)}
            className={clsx(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all relative",
              isMoreActive
                ? "text-primary-600 dark:text-primary-400"
                : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
            )}
          >
            <div className="relative">
              <MoreHorizontal className={clsx("w-5 h-5", isMoreActive && "fill-current")} />
              {moreHasNotification && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-error-500 rounded-full border-2 border-white dark:border-neutral-900" />
              )}
            </div>
            <span className="text-[10px] font-medium">{t("parent_nav.more")}</span>
          </button>
        </div>
      </nav>

      {/* More Sheet (Mobile) */}
      <MoreSheet
        isOpen={moreOpen}
        onClose={() => setMoreOpen(false)}
        onSignOut={handleSignOut}
        unpaidCount={unpaidInvoiceCount}
        incompleteHomeworkCount={incompleteHomeworkCount}
      />

      {/* Sidebar Navigation (Desktop) */}
      <nav className="fixed left-0 top-0 bottom-0 w-56 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 hidden lg:flex flex-col py-6">
        {/* Profile Header */}
        <div className="px-5 pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">{childInitial}</span>
            </div>
            <div>
              <p className="font-bold text-neutral-900 dark:text-white text-sm leading-tight">
                {childFirstName}
              </p>
              <p className="text-[10px] text-neutral-400">{t("parent_nav.parent_portal")}</p>
            </div>
          </div>
        </div>

        {/* Nav Items */}
        <div className="flex-1 overflow-y-auto px-3 pt-4 space-y-1">
          {allNavItems.map((item) => {
            const active = isActive(item.href);
            const isMessages = item.key === "messages";
            const isBilling = item.key === "billing";
            const isHomework = item.key === "homework";
            
            return (
              <Link
                key={item.key}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium relative",
                  active
                    ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                    : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {isMessages && unreadMessageCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 bg-error-500 text-white text-[10px] font-bold rounded-full">
                    {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
                  </span>
                )}
                {isBilling && unpaidInvoiceCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 bg-error-500 text-white text-[10px] font-bold rounded-full">
                    {unpaidInvoiceCount}
                  </span>
                )}
                {isHomework && incompleteHomeworkCount > 0 && (
                  <span className="ml-auto px-1.5 py-0.5 bg-primary-500 text-white text-[10px] font-bold rounded-full">
                    {incompleteHomeworkCount}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Bottom Section */}
        <div className="px-3 pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-1">
          <div className="flex items-center justify-between px-3 mb-2">
            <div className="relative flex items-center gap-1">
              <ParentNotificationBell desktop />
              <ParentNotificationDropdown desktop />
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-error-50 dark:hover:bg-error-900/10 hover:text-error-600 w-full"
          >
            <LogOut className="w-5 h-5" />
            <span>{t("parent_nav.sign_out")}</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <ParentLayoutContent>{children}</ParentLayoutContent>;
}
