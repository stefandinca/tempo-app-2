"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import NotificationFilters, { FilterCategory } from "@/components/notifications/NotificationFilters";
import NotificationList from "@/components/notifications/NotificationList";
import { ArrowLeft, Settings, Loader2 } from "lucide-react";
import Link from "next/link";

export default function NotificationsPage() {
  const router = useRouter();
  const { notifications, filterByCategory, loadMore, hasMore, markAllAsRead, unreadCount } = useNotifications();
  const [activeFilter, setActiveFilter] = useState<FilterCategory>("all");
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const filteredNotifications = useMemo(() => {
    return filterByCategory(activeFilter);
  }, [filterByCategory, activeFilter]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMore();
    setIsLoadingMore(false);
  };

  const getEmptyMessage = () => {
    switch (activeFilter) {
      case "unread":
        return "No unread notifications";
      case "schedule":
        return "No schedule notifications";
      case "attendance":
        return "No attendance notifications";
      case "team":
        return "No team notifications";
      case "billing":
        return "No billing notifications";
      case "client":
        return "No client notifications";
      case "message":
        return "No message notifications";
      default:
        return "No notifications yet";
    }
  };

  return (
    <div className="flex-1 max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="sticky top-16 z-10 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <p className="text-xs text-neutral-500">
                  {unreadCount} unread
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-1.5"
              >
                Mark all read
              </button>
            )}
            <Link
              href="/settings"
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              <Settings className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
            </Link>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="px-4 pb-3">
          <NotificationFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
          />
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-neutral-900 border-x border-b border-neutral-200 dark:border-neutral-800 min-h-[calc(100vh-200px)]">
        <NotificationList
          notifications={filteredNotifications}
          showDateGroups={true}
          emptyMessage={getEmptyMessage()}
        />

        {/* Load More Button */}
        {hasMore && filteredNotifications.length > 0 && (
          <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="w-full py-3 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </>
              ) : (
                "Load More"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
