"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { User, Bell, Shield, Moon, LogOut, Check, CreditCard, Monitor, Loader2, Globe, Camera } from "lucide-react";
import { clsx } from "clsx";
import BillingConfigTab from "@/components/settings/BillingConfigTab";
import TranslationManager from "@/components/settings/TranslationManager";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useTranslation } from "react-i18next";

const COLORS = ["#4A90E2", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, userData, userRole, signOut, changeEmail, changePassword } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [theme, setTheme] = useState("light");
  const [isSaving, setIsSaving] = useState(false);

  // Profile Form State
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [profileColor, setProfileColor] = useState(COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (userData) {
      setProfileName(userData.name || "");
      setProfileEmail(userData.email || user?.email || "");
      setProfilePhone(userData.phone || "");
      if (userData.color) setProfileColor(userData.color);
      if (userData.photoURL) setAvatarUrl(userData.photoURL);
    }
  }, [userData, user]);

  const isAdmin = userRole?.toLowerCase() === "admin";

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.match('image.*')) {
      error("Please select an image file (PNG, JPG)");
      return;
    }

    setIsSaving(true);
    try {
      const storageRef = ref(storage, `avatars/${user.uid}/${file.name}`);
      await uploadBytes(storageRef, file, { contentType: file.type });
      const url = await getDownloadURL(storageRef);
      
      // Update Firestore immediately for the avatar
      const userRef = doc(db, "team_members", user.uid);
      await updateDoc(userRef, { photoURL: url });
      
      setAvatarUrl(url);
      success("Avatar uploaded successfully");
    } catch (err) {
      console.error(err);
      error("Failed to upload avatar");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // 1. Update Auth Email if changed
      if (profileEmail !== user.email) {
        try {
          await changeEmail(profileEmail);
        } catch (err: any) {
          if (err.code === 'auth/requires-recent-login') {
            error(t('settings.profile.reauth_required'));
            setIsSaving(false);
            return;
          }
          throw err;
        }
      }

      // 2. Update Auth Password if provided
      if (newPassword) {
        try {
          await changePassword(newPassword);
        } catch (err: any) {
          if (err.code === 'auth/requires-recent-login') {
            error(t('settings.profile.reauth_required'));
            setIsSaving(false);
            return;
          }
          throw err;
        }
      }

      // 3. Update Firestore
      const userRef = doc(db, "team_members", user.uid);
      await updateDoc(userRef, {
        name: profileName,
        email: profileEmail,
        phone: profilePhone,
        color: profileColor
      });
      
      success(t('settings.profile.success'));
      setNewPassword(""); // Clear password field after success
    } catch (err: any) {
      console.error(err);
      error(t('settings.profile.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng);
    if (user) {
      try {
        const userRef = doc(db, "team_members", user.uid);
        await updateDoc(userRef, { language: lng });
      } catch (err) {
        console.error("Error saving language preference:", err);
      }
    }
  };

  const menuItems = [
    { id: "profile", label: t('settings.tabs.profile'), icon: User },
    { id: "notifications", label: t('settings.tabs.notifications'), icon: Bell },
    { id: "security", label: t('settings.tabs.security'), icon: Shield },
    { id: "appearance", label: t('settings.tabs.appearance'), icon: Moon },
  ];

  if (isAdmin) {
    menuItems.push(
      { id: "billing", label: t('settings.tabs.billing'), icon: CreditCard },
      { id: "translations", label: "Translations", icon: Globe },
      { id: "system", label: t('settings.tabs.system'), icon: Monitor }
    );
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full pb-24 lg:pb-6">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{t('settings.title')}</h1>
        <p className="text-sm text-neutral-500">{t('settings.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar Nav */}
        <nav className="space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors text-left",
                activeTab === item.id
                  ? "bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400"
                  : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          
          <div className="pt-4 mt-4 border-t border-neutral-200 dark:border-neutral-800">
            <button
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 transition-colors text-left"
            >
              <LogOut className="w-4 h-4" />
              {t('nav.sign_out')}
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {activeTab === "profile" && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('settings.profile.title')}</h3>
                <p className="text-sm text-neutral-500">{t('settings.profile.subtitle')}</p>
              </div>
              
              <div className="flex flex-col gap-6">
                {/* Avatar Section */}
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="relative group">
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-sm transition-all overflow-hidden border-4 border-white dark:border-neutral-800"
                      style={{ backgroundColor: avatarUrl ? 'transparent' : profileColor }}
                    >
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        userData?.initials || user?.email?.[0].toUpperCase() || "U"
                      )}
                    </div>
                    <button 
                      onClick={handleAvatarClick}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Camera className="w-6 h-6" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileChange}
                    />
                  </div>

                  <div className="flex-1 space-y-3 w-full">
                    <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('settings.profile.avatar_color')}</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setProfileColor(c)}
                          className={clsx(
                            "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                            profileColor === c ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : "hover:scale-105 opacity-80 hover:opacity-100"
                          )}
                          style={{ backgroundColor: c }}
                        >
                          {profileColor === c && <Check className="w-4 h-4 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.full_name')}</label>
                    <input 
                      type="text" 
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.email')}</label>
                    <input 
                      type="email" 
                      value={profileEmail} 
                      onChange={(e) => setProfileEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.phone')}</label>
                    <input 
                      type="tel" 
                      value={profilePhone}
                      onChange={(e) => setProfilePhone(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.profile.password')}</label>
                    <input 
                      type="password" 
                      placeholder={t('settings.profile.password_placeholder')}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('common.role')}</label>
                    <input 
                      type="text" 
                      value={userRole || "User"} 
                      disabled
                      className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button 
                  onClick={handleProfileSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {t('common.save')}
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && <NotificationPreferences />}

          {activeTab === "appearance" && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Theme Section */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('settings.appearance.theme')}</h3>
                  <p className="text-sm text-neutral-500">{t('settings.appearance.subtitle')}</p>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {['light', 'dark', 'system'].map((t_key) => (
                    <button
                      key={t_key}
                      onClick={() => setTheme(t_key)}
                      className={clsx(
                        "p-4 rounded-xl border-2 text-center transition-all",
                        theme === t_key 
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" 
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                      )}
                    >
                      <p className="text-sm font-bold capitalize text-neutral-900 dark:text-white">
                        {t(`settings.appearance.themes.${t_key}`)}
                      </p>
                      {theme === t_key && <Check className="w-4 h-4 text-primary-500 mx-auto mt-2" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Language Section */}
              <div className="space-y-4 pt-8 border-t border-neutral-100 dark:border-neutral-800">
                <div>
                  <h3 className="text-lg font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary-500" />
                    {t('settings.appearance.language')}
                  </h3>
                  <p className="text-sm text-neutral-500">Selectati limba preferata pentru aplicatie.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'ro', label: 'Română', flag: '🇷🇴' },
                    { id: 'en', label: 'English', flag: '🇺🇸' }
                  ].map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => changeLanguage(lang.id)}
                      className={clsx(
                        "p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between group",
                        i18n.language.startsWith(lang.id)
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" 
                          : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{lang.flag}</span>
                        <span className={clsx(
                          "font-bold",
                          i18n.language.startsWith(lang.id) ? "text-primary-700 dark:text-primary-300" : "text-neutral-700 dark:text-neutral-300"
                        )}>
                          {lang.label}
                        </span>
                      </div>
                      {i18n.language.startsWith(lang.id) && (
                        <Check className="w-5 h-5 text-primary-500" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "billing" && isAdmin && <BillingConfigTab />}
          {activeTab === "translations" && isAdmin && <TranslationManager />}
          
          {activeTab === "system" && isAdmin && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{t('settings.tabs.system')}</h3>
                <p className="text-sm text-neutral-500">Advanced system configuration.</p>
              </div>
              <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-center text-neutral-500">
                System health metrics and feature flags will appear here.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
