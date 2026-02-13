"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  CheckCircle,
  Users,
  CreditCard,
  User,
  Loader2,
  Bell,
  Mail,
  MessageSquare
} from "lucide-react";
import { clsx } from "clsx";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useTranslation } from "react-i18next";

interface CategoryPreference {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}

type EmailDigest = "instant" | "daily" | "weekly" | "never";

export default function NotificationPreferences() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [categories, setCategories] = useState<CategoryPreference[]>([
    {
      id: "schedule",
      label: t('notifications.preferences.categories.schedule_label'),
      description: t('notifications.preferences.categories.schedule_desc'),
      icon: Calendar,
      enabled: true
    },
    {
      id: "attendance",
      label: t('notifications.preferences.categories.attendance_label'),
      description: t('notifications.preferences.categories.attendance_desc'),
      icon: CheckCircle,
      enabled: true
    },
    {
      id: "message",
      label: t('notifications.preferences.categories.message_label'),
      description: t('notifications.preferences.categories.message_desc'),
      icon: MessageSquare,
      enabled: true
    },
    {
      id: "team",
      label: t('notifications.preferences.categories.team_label'),
      description: t('notifications.preferences.categories.team_desc'),
      icon: Users,
      enabled: false
    },
    {
      id: "client",
      label: t('notifications.preferences.categories.client_label'),
      description: t('notifications.preferences.categories.client_desc'),
      icon: User,
      enabled: true
    },
    {
      id: "billing",
      label: t('notifications.preferences.categories.billing_label'),
      description: t('notifications.preferences.categories.billing_desc'),
      icon: CreditCard,
      enabled: true
    }
  ]);

  const [emailDigest, setEmailDigest] = useState<EmailDigest>("daily");

  useEffect(() => {
    async function loadPreferences() {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, "team_members", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.notificationPreferences) {
            setCategories(prev => prev.map(cat => ({
              ...cat,
              enabled: data.notificationPreferences.categories?.[cat.id] ?? cat.enabled
            })));
            if (data.notificationPreferences.emailDigest) {
              setEmailDigest(data.notificationPreferences.emailDigest);
            }
          }
        }
      } catch (err) {
        console.error("Error loading preferences:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPreferences();
  }, [user]);

  const toggleCategory = (id: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === id ? { ...cat, enabled: !cat.enabled } : cat
      )
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const prefs = {
        categories: categories.reduce((acc, cat) => ({
          ...acc,
          [cat.id]: cat.enabled
        }), {}),
        emailDigest,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, "team_members", user.uid), {
        notificationPreferences: prefs
      });
      
      success(t('notifications.preferences.save_success'));
    } catch (err) {
      console.error("Error saving preferences:", err);
      error(t('notifications.preferences.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* In-App Notifications Section */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {t('notifications.preferences.in_app_title')}
            </h3>
            <p className="text-sm text-neutral-500">
              {t('notifications.preferences.in_app_subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white dark:bg-neutral-800 flex items-center justify-center shadow-sm">
                  <category.icon className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                </div>
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white text-sm">
                    {category.label}
                  </p>
                  <p className="text-xs text-neutral-500">{category.description}</p>
                </div>
              </div>
              <button
                onClick={() => toggleCategory(category.id)}
                className={clsx(
                  "w-12 h-6 rounded-full transition-colors relative flex-shrink-0",
                  category.enabled
                    ? "bg-primary-500"
                    : "bg-neutral-300 dark:bg-neutral-700"
                )}
              >
                <div
                  className={clsx(
                    "absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm",
                    category.enabled ? "translate-x-6" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Email Notifications Section */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-secondary-50 dark:bg-secondary-900/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-secondary-600 dark:text-secondary-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              {t('notifications.preferences.email_title')}
            </h3>
            <p className="text-sm text-neutral-500">
              {t('notifications.preferences.email_subtitle')}
            </p>
          </div>
        </div>

        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-neutral-900 dark:text-white text-sm">
                {t('notifications.preferences.email_digest')}
              </p>
              <p className="text-xs text-neutral-500">
                {t('notifications.preferences.email_digest_desc')}
              </p>
            </div>
            <select
              value={emailDigest}
              onChange={(e) => setEmailDigest(e.target.value as EmailDigest)}
              className="px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm font-medium text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all cursor-pointer"
            >
              <option value="instant">{t('notifications.preferences.instant')}</option>
              <option value="daily">{t('notifications.preferences.daily')}</option>
              <option value="weekly">{t('notifications.preferences.weekly')}</option>
              <option value="never">{t('notifications.preferences.never')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
          {t('notifications.preferences.save_preferences')}
        </button>
      </div>
    </div>
  );
}
