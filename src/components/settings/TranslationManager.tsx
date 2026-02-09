"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Search, Save, RotateCcw, Loader2, Check, AlertCircle, Globe } from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { clsx } from "clsx";
import { syncTranslationsToFirestore } from "@/lib/i18n/sync";
import { useConfirm } from "@/context/ConfirmContext";

export default function TranslationManager() {
  const [lang, setLang] = useState<"ro" | "en">("ro");
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();

  // Load translations from Firestore
  const loadTranslations = async () => {
    setLoading(true);
    try {
      const docRef = doc(db, "system_settings", `translations_${lang}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        setTranslations(docSnap.data().data);
      } else {
        // If doesn't exist, try to sync first
        await syncTranslationsToFirestore();
        const retrySnap = await getDoc(docRef);
        if (retrySnap.exists()) {
          setTranslations(retrySnap.data().data);
        }
      }
    } catch (err) {
      console.error(err);
      error("Failed to load translations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTranslations();
  }, [lang]);

  // Flatten object for easier searching/editing
  const flattenObject = (obj: any, prefix = '') => {
    return Object.keys(obj).reduce((acc: any, k) => {
      const pre = prefix.length ? prefix + '.' : '';
      if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
        Object.assign(acc, flattenObject(obj[k], pre + k));
      } else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  };

  const flattened = flattenObject(translations);
  const filteredKeys = Object.keys(flattened).filter(key => 
    key.toLowerCase().includes(search.toLowerCase()) || 
    String(flattened[key]).toLowerCase().includes(search.toLowerCase())
  );

  const handleUpdate = (key: string, value: string) => {
    // Un-flatten and update
    const newTranslations = { ...translations };
    const parts = key.split('.');
    let current = newTranslations;
    
    for (let i = 0; i < parts.length - 1; i++) {
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
    
    setTranslations(newTranslations);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, "system_settings", `translations_${lang}`);
      await updateDoc(docRef, {
        data: translations,
        updatedAt: new Date().toISOString()
      });
      success("Translations saved! Refresh the app to see changes.");
    } catch (err) {
      console.error(err);
      error("Failed to save translations");
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    customConfirm({
      title: "Sync Translations",
      message: "This will merge missing keys from local files into Firestore. Continue?",
      confirmLabel: "Sync",
      variant: 'warning',
      onConfirm: async () => {
        setSaving(true);
        try {
          await syncTranslationsToFirestore();
          await loadTranslations();
          success("Synced successfully");
        } catch (err) {
          error("Sync failed");
        } finally {
          setSaving(false);
        }
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setLang("ro")}
            className={clsx(
              "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all",
              lang === "ro" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary-600" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            RO 🇷🇴
          </button>
          <button
            onClick={() => setLang("en")}
            className={clsx(
              "flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all",
              lang === "en" ? "bg-white dark:bg-neutral-700 shadow-sm text-primary-600" : "text-neutral-500 hover:text-neutral-700"
            )}
          >
            EN 🇺🇸
          </button>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSync}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Sync from Files
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-bold shadow-lg shadow-primary-500/20 disabled:opacity-50 transition-all"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          placeholder="Search translation keys or values..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all"
        />
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
        <div className="max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-neutral-50 dark:bg-neutral-800 z-10">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider w-1/3">Key / ID</th>
                <th className="px-6 py-3 text-xs font-bold text-neutral-500 uppercase tracking-wider w-2/3">Translation Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {loading ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500 mb-2" />
                    <p className="text-neutral-500">Loading translations...</p>
                  </td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={2} className="px-6 py-12 text-center">
                    <AlertCircle className="w-8 h-8 mx-auto text-neutral-300 mb-2" />
                    <p className="text-neutral-500">No matching translations found.</p>
                  </td>
                </tr>
              ) : (
                filteredKeys.map((key) => (
                  <tr key={key} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="px-6 py-4 align-top">
                      <code className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-600 dark:text-neutral-400">
                        {key}
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      <textarea
                        value={flattened[key]}
                        onChange={(e) => handleUpdate(key, e.target.value)}
                        rows={String(flattened[key]).length > 60 ? 3 : 1}
                        className="w-full px-3 py-1.5 text-sm bg-neutral-50 dark:bg-neutral-800/50 border border-transparent focus:border-primary-500 focus:bg-white dark:focus:bg-neutral-800 rounded-lg transition-all resize-none"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-xl flex items-start gap-3">
        <Globe className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
          <p className="font-bold">Dynamic Translation Mode</p>
          <p>These changes are stored in Firestore. The app will prioritize these values over the static JSON files. Perfect for instant clinical updates.</p>
        </div>
      </div>
    </div>
  );
}
