"use client";

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import en from './locales/en.json';
import ro from './locales/ro.json';

const resources = {
  en: { translation: en },
  ro: { translation: ro },
};

// Custom backend to fetch translations from Firestore
const firestoreBackend = {
  type: 'backend' as const,
  init: () => {},
  read: async (language: string, namespace: string, callback: (err: any, data: any) => void) => {
    try {
      const docRef = doc(db, "system_settings", `translations_${language}`);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const firestoreData = docSnap.data().data;
        // Merge: JSON (Base) + Firestore (Overrides)
        const baseTranslations = resources[language as keyof typeof resources]?.translation || {};
        const merged = { ...baseTranslations, ...firestoreData };
        callback(null, merged);
      } else {
        // Fallback to local JSON if Firestore is empty
        callback(null, resources[language as keyof typeof resources]?.translation || {});
      }
    } catch (err) {
      console.error('Error loading translations from Firestore:', err);
      callback(null, resources[language as keyof typeof resources]?.translation || {});
    }
  }
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(firestoreBackend) // Add our custom backend
  .use(initReactI18next)
  .init({
    fallbackLng: 'ro',
    lng: typeof window !== 'undefined' ? localStorage.getItem('i18nextLng') || 'ro' : 'ro',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    // Remove hardcoded resources here to let backend handle it
    // but keep them in the backend for the merge logic
    partialBundledLanguages: true,
    react: {
      useSuspense: false // Set to false to avoid flickering during Firestore fetch
    }
  });

export default i18n;
