"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound, ChevronRight } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { useParentAuth } from "@/context/ParentAuthContext";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

function ParentLoginContent() {
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, authenticateWithCode } = useParentAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated) {
      router.replace("/parent/dashboard/");
    }
  }, [isAuthenticated, authLoading, router]);

  // Auto-fill code from URL if present
  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (code.length < 4) {
      setError(t('auth.access_code_placeholder'));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "clients"), 
        where("clientCode", "==", code.toUpperCase())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setError(t('auth.invalid_code'));
        setIsLoading(false);
        return;
      }

      // Found the client
      const clientDoc = querySnapshot.docs[0];
      const clientData = clientDoc.data();

      // Use context method to authenticate atomically
      await authenticateWithCode(clientDoc.id, clientData.name, code.toUpperCase());

      console.log("[ParentLogin] Atomic authentication successful.");
      router.push(`/parent/dashboard/`);
    } catch (err: any) {
      console.error("Verification error:", err);
      setError(t('auth.sign_in_error'));
      setIsLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4 relative">
      
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
        <button
          onClick={() => changeLanguage('ro')}
          className={clsx(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
            i18n.language.startsWith('ro') ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          )}
        >
          RO
        </button>
        <button
          onClick={() => changeLanguage('en')}
          className={clsx(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
            i18n.language.startsWith('en') ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400" : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          )}
        >
          EN
        </button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-8 sm:p-12 text-center">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mb-6">
            <KeyRound className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            {t('auth.parent_login_title')}
          </h1>
          <p className="text-neutral-500 text-sm mb-8">
            {t('auth.parent_login_subtitle')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder={t('auth.access_code')}
                className="w-full px-6 py-4 bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl text-center text-xl font-mono tracking-[0.5em] uppercase focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-neutral-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 8))}
                maxLength={8}
                autoFocus
              />
            </div>

            {error && <p className="text-error-500 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {t('auth.access_parent_portal')}
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 text-center border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 leading-relaxed">
            {t('parent_portal.billing.disclaimer')}
          </p>
        </div>
      </div>
      
      <Link href="/login/" className="mt-8 text-sm text-neutral-500 hover:text-primary-600 transition-colors">
        {t('auth.access_staff_portal')}
      </Link>
    </div>
  );
}

export default function ParentLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    }>
      <ParentLoginContent />
    </Suspense>
  );
}
