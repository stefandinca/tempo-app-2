"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { User, Bell, Shield, Moon, LogOut, Check, CreditCard, Monitor, Loader2 } from "lucide-react";
import { clsx } from "clsx";
import BillingConfigTab from "@/components/settings/BillingConfigTab";
import NotificationPreferences from "@/components/notifications/NotificationPreferences";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const COLORS = ["#4A90E2", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];

export default function SettingsPage() {
  const { user, userData, userRole, signOut } = useAuth();
  const { success, error } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  const [theme, setTheme] = useState("light");
  const [isSaving, setIsSaving] = useState(false);

  // Profile Form State
  const [profileName, setProfileName] = useState("");
  const [profileColor, setProfileColor] = useState(COLORS[0]);

  useEffect(() => {
    if (userData) {
      setProfileName(userData.name || "");
      if (userData.color) setProfileColor(userData.color);
    }
  }, [userData]);

  const isAdmin = userRole?.toLowerCase() === "admin";

  const handleProfileSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      // Update team_members collection (where AuthContext reads profile data)
      const userRef = doc(db, "team_members", user.uid);
      await updateDoc(userRef, {
        name: profileName,
        color: profileColor
      });
      success("Profile updated successfully");
    } catch (err: any) {
      console.error(err);
      error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    { id: "profile", label: "Profile", icon: User },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: Shield },
    { id: "appearance", label: "Appearance", icon: Moon },
  ];

  if (isAdmin) {
    menuItems.push(
      { id: "billing", label: "Billing Config", icon: CreditCard },
      { id: "system", label: "System", icon: Monitor }
    );
  }

  return (
    <div className="flex-1 p-6 max-w-5xl mx-auto w-full">
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Settings</h1>
        <p className="text-sm text-neutral-500">Manage your account and system preferences</p>
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
              Sign Out
            </button>
          </div>
        </nav>

        {/* Content Area */}
        <div className="lg:col-span-3 space-y-6">
          
          {activeTab === "profile" && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Profile Information</h3>
                <p className="text-sm text-neutral-500">Update your personal details.</p>
              </div>
              
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-sm transition-all"
                    style={{ backgroundColor: profileColor }}
                  >
                    {userData?.initials || user?.email?.[0].toUpperCase() || "U"}
                  </div>
                  <div>
                    <p className="text-sm font-medium mb-2">Avatar Color</p>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Full Name</label>
                  <input 
                    type="text" 
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Email Address</label>
                  <input 
                    type="email" 
                    value={user?.email || ""} 
                    disabled
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Role</label>
                  <input 
                    type="text" 
                    value={userRole || "User"} 
                    disabled
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex justify-end">
                <button 
                  onClick={handleProfileSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && <NotificationPreferences />}

          {activeTab === "appearance" && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Appearance</h3>
                <p className="text-sm text-neutral-500">Customize the interface.</p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {['light', 'dark', 'system'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={clsx(
                      "p-4 rounded-xl border-2 text-center transition-all",
                      theme === t 
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20" 
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                    )}
                  >
                    <p className="text-sm font-bold capitalize text-neutral-900 dark:text-white">{t}</p>
                    {theme === t && <Check className="w-4 h-4 text-primary-500 mx-auto mt-2" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === "billing" && isAdmin && <BillingConfigTab />}
          
          {activeTab === "system" && isAdmin && (
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-lg font-bold text-neutral-900 dark:text-white">System Settings</h3>
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