"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/context/NotificationContext";
import NotificationList from "@/components/notifications/NotificationList";
import { ArrowLeft, Bell, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ParentNotificationsPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { notifications, unreadCount, markAllAsRead, loadMore, hasMore, loading } = useNotifications();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    await loadMore();
    setIsLoadingMore(false);
  };

  return (
    <div className="flex-1 max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 lg:pb-0">
      {/* Header */}
      <div className="sticky top-0 lg:top-0 z-20 bg-neutral-50/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
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
                  {unreadCount === 1 ? "1 unread update" : `${unreadCount} unread updates`}
                </p>
              )}
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-primary-500 hover:text-primary-600 dark:hover:text-primary-400 px-3 py-1.5"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white dark:bg-neutral-900 border-x border-b border-neutral-200 dark:border-neutral-800 min-h-[calc(100vh-120px)]">
        <NotificationList
          notifications={notifications}
          showDateGroups={true}
          emptyMessage="No notifications yet"
        />

        {/* Load More Button */}
        {hasMore && notifications.length > 0 && (
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
                "Load more"
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
