"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Activity as ActivityIcon, Calendar, Users, FileText, UserCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useActivitiesByCategory } from "@/hooks/useActivities";
import { ActivityCategory } from "@/types/activity";
import { clsx } from "clsx";
import { formatDistanceToNow } from "date-fns";
import { enUS, ro } from "date-fns/locale";

const getCategoryIcon = (id: ActivityCategory) => {
  switch (id) {
    case 'sessions': return Calendar;
    case 'attendance': return UserCheck;
    case 'evaluations': return FileText;
    case 'clients': return Users;
    case 'team': return Users;
    default: return Users;
  }
};

export default function ActivityPage() {
  const { t, i18n } = useTranslation();
  const [selectedCategory, setSelectedCategory] = useState<ActivityCategory>('sessions');
  const { activities, loading, loadingMore, hasMore, loadMore } = useActivitiesByCategory(selectedCategory);

  const locale = i18n.language === 'ro' ? ro : enUS;

  const categories: ActivityCategory[] = ['sessions', 'attendance', 'evaluations', 'clients', 'team'];

  const getActivityMessage = (activity: any): string => {
    const metadata = activity.metadata || {};

    switch (activity.type) {
      case 'session_created':
        return t('dashboard.activity.messages.session_created', { clientName: metadata.clientName || activity.targetName });
      case 'session_updated':
        return t('dashboard.activity.messages.session_updated', { clientName: metadata.clientName || activity.targetName });
      case 'attendance_updated':
        return t('dashboard.activity.messages.attendance_updated', {
          clientName: metadata.clientName || activity.targetName,
          attendance: metadata.attendance || 'present'
        });
      case 'evaluation_created':
        return t('dashboard.activity.messages.evaluation_created', {
          evaluationType: metadata.evaluationType || 'evaluation',
          clientName: metadata.clientName || activity.targetName
        });
      case 'evaluation_updated':
        return t('dashboard.activity.messages.evaluation_updated', {
          evaluationType: metadata.evaluationType || 'evaluation',
          clientName: metadata.clientName || activity.targetName
        });
      case 'client_created':
        return t('dashboard.activity.messages.client_created', { clientName: activity.targetName });
      case 'client_updated':
        return t('dashboard.activity.messages.client_updated', { clientName: activity.targetName });
      case 'team_member_created':
        return t('dashboard.activity.messages.team_member_created', { memberName: activity.targetName });
      case 'team_member_updated':
        return t('dashboard.activity.messages.team_member_updated', { memberName: activity.targetName });
      default:
        return t('dashboard.activity.messages.default', { targetName: activity.targetName });
    }
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/" className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-neutral-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('dashboard.activity.title')}</h1>
          <p className="text-sm text-neutral-500 mt-1">{t('activity.subtitle')}</p>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 overflow-x-auto">
        <div className="flex items-center gap-1 min-w-max">
          {categories.map((categoryId) => {
            const Icon = getCategoryIcon(categoryId);
            return (
              <button
                key={categoryId}
                onClick={() => setSelectedCategory(categoryId)}
                className={clsx(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all relative",
                  selectedCategory === categoryId
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
                )}
              >
                <Icon className="w-4 h-4" />
                {t(`activity.categories.${categoryId}`)}
                {selectedCategory === categoryId && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Activities List */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        {loading ? (
          <div className="p-12 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : activities.length === 0 ? (
          <div className="p-12 text-center">
            <ActivityIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{t('activity.no_activities')}</h3>
            <p className="text-neutral-500">{t('activity.no_activities_category')}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {activities.map((activity) => (
                <div key={activity.id} className="p-4 flex items-start gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  {activity.userPhotoURL ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 shadow-sm border-2 border-white dark:border-neutral-800">
                      <img src={activity.userPhotoURL} alt={activity.userName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded-full flex items-center justify-center flex-shrink-0 font-bold">
                      {activity.userName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-900 dark:text-white">
                      <span className="font-medium">{activity.userName}</span>
                      <span className="text-neutral-500 dark:text-neutral-400"> {getActivityMessage(activity)}</span>
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true, locale })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full py-2 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
