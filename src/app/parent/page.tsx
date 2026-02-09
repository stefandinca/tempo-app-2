"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound, ChevronRight, HelpCircle } from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { useParentAuth } from "@/context/ParentAuthContext";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60_000;

function ParentLoginContent() {
  const { t, i18n } = useTranslation();
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading, authenticateWithCode } = useParentAuth();

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      router.replace("/parent/dashboard/");
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    const urlCode = searchParams.get("code");
    if (urlCode) {
      setCode(urlCode.toUpperCase());
    }
  }, [searchParams]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = code.trim().toUpperCase();
    
    if (cleanCode.length < 4) {
      setError(t('auth.access_code_placeholder'));
      return;
    }

    const now = Date.now();
    if (lockoutUntil > now) {
      const secondsLeft = Math.ceil((lockoutUntil - now) / 1000);
      setError(t('auth.too_many_attempts', { seconds: secondsLeft }));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Ensure we are signed in anonymously before querying
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const q = query(
        collection(db, "clients"),
        where("clientCode", "==", cleanCode)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        if (newAttempts >= MAX_ATTEMPTS) {
          setLockoutUntil(Date.now() + LOCKOUT_DURATION_MS);
          setError(t('auth.too_many_attempts', { seconds: 60 }));
        } else {
          setError(t('auth.invalid_code'));
        }
        setIsLoading(false);
        return;
      }

      const clientDoc = querySnapshot.docs[0];
      const clientData = clientDoc.data();

      await authenticateWithCode(clientDoc.id, clientData.name, cleanCode);

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
      <div className="absolute top-4 right-4 flex items-center gap-1 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
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

      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="p-8 sm:p-12 text-center">
          {/* Logo */}
          <div className={clsx(
            "mx-auto w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300",
            isFocused
              ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-105"
              : "bg-primary-100 dark:bg-primary-900/30 text-primary-600"
          )}>
            <KeyRound className="w-9 h-9" />
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
                className={clsx(
                  "w-full px-6 py-5 bg-neutral-50 dark:bg-neutral-800 rounded-2xl text-center text-2xl font-mono tracking-[0.5em] uppercase transition-all placeholder:text-neutral-400 placeholder:tracking-normal placeholder:font-sans placeholder:text-base focus:outline-none",
                  isFocused
                    ? "ring-2 ring-primary-500 border-transparent bg-white dark:bg-neutral-800 shadow-lg shadow-primary-500/10"
                    : "border border-neutral-200 dark:border-neutral-700"
                )}
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 8))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                maxLength={8}
                autoFocus
              />
              {code.length > 0 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className={clsx(
                        "w-2 h-2 rounded-full transition-all duration-200",
                        i < code.length
                          ? "bg-primary-500 scale-100"
                          : "bg-neutral-200 dark:bg-neutral-700 scale-75"
                      )}
                    />
                  ))}
                </div>
              )}
            </div>

            {error && (
              <p className="text-error-500 text-sm animate-in fade-in slide-in-from-top-2 duration-200">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || code.length < 4}
              className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
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

        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-5 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-500 leading-relaxed">
              {t('parent_portal.login.help_text')}
            </p>
          </div>
        </div>
      </div>

      <Link href="/login/" className="mt-8 text-sm text-neutral-400 hover:text-primary-600 transition-colors">
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
