# Multi-Language Support Implementation Guide

This document outlines the strategy and technical steps for implementing multi-language support (Romanian and English) in TempoApp2.

## 1. Core Architecture: `i18next` & `react-i18next`

Since TempoApp2 uses **Static Export** (`output: 'export'`), we cannot use Next.js built-in localized routing (which requires a Node.js server). 

We will use **`react-i18next`**, which is the industry standard for client-side internationalization in React and works perfectly with static sites.

### Key Benefits:
- **Client-Side State**: Changes happen instantly without page reloads.
- **Hook-based**: Easy to use via the `useTranslation` hook.
- **TypeScript Support**: Full type safety for translation keys.
- **Persistence**: Easily integrates with `localStorage` and Firestore.

---

## 2. Technical Setup

### Step 1: Install Dependencies
```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

### Step 2: Translation Files Structure
We will store translations in a structured JSON format inside `src/lib/i18n/locales/`.

```
src/lib/i18n/
├── locales/
│   ├── en.json
│   └── ro.json
└── index.ts (Initialization logic)
```

### Step 3: Initialization (`src/lib/i18n/index.ts`)
Initialize i18next with language detection and a fallback to Romanian.

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en.json';
import ro from './locales/ro.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ro: { translation: ro },
    },
    fallbackLng: 'ro',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
```

---

## 3. User Preference Persistence

To ensure the language remains consistent across devices, we will store the choice in Firestore.

### For Staff (`team_members` collection)
- Add a `language` field: `'en' | 'ro'`.
- Update via `SettingsPage.tsx`.

### For Parents (`clients` collection)
- Add a `language` field: `'en' | 'ro'`.
- Since parents are authenticated anonymously and linked to a client, we store the preference on the client document.

---

## 4. UI Implementation

### Step 1: Language Switcher Component
Create a reusable component `src/components/ui/LanguageSwitcher.tsx` using a segment control or dropdown.

### Step 2: Settings Integration
Add a "Language" section to the **Appearance** tab in `src/app/(dashboard)/settings/page.tsx`.

```tsx
// Example UI logic
const { i18n } = useTranslation();

const changeLanguage = async (lng: string) => {
  i18n.changeLanguage(lng);
  // Also save to Firestore
  if (user) {
    const userRef = doc(db, userRole === 'Parent' ? "clients" : "team_members", targetId);
    await updateDoc(userRef, { language: lng });
  }
};
```

---

## 5. Implementation Roadmap

1.  **Preparation**: Install libraries and create `en.json`/`ro.json` with existing UI text.
2.  **Infrastructure**: Setup `src/lib/i18n/index.ts` and import it in `src/app/layout.tsx`.
3.  **Refactoring**: Replace hardcoded text with the `t('key')` function across the application.
4.  **Sync**: Update `AuthContext` and `ParentAuthContext` to apply the stored language upon login.
5.  **Clinical Accuracy**: Corina (Clinical Director) will review `ro.json` and `en.json` to ensure ABA and Speech Therapy terminology is precise.

---

## 6. Development Best Practices

- **Naming Keys**: Use logical namespaces (e.g., `common.save`, `dashboard.welcome`, `evaluations.ablls.title`).
- **Missing Keys**: Use the `i18next-parser` tool to automatically extract strings from the codebase into JSON files.
- **Direction**: Both English and Romanian are Left-to-Right (LTR), so no RTL layout changes are needed.
