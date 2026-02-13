"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Loader2, Globe, Play, Rocket, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { IS_DEMO, db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const { signIn, signInAnonymous, user, userRole, loading: authLoading } = useAuth();
  
  // Lead Form State
  const [leadData, setLeadData] = useState({
    name: "",
    email: "",
    phone: "",
    clinic: "",
    consent: false
  });

  const router = useRouter();

  // Auto-login if demo=true in URL (for demo.tempoapp.ro)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (IS_DEMO && params.get("demo") === "true" && !user) {
      handleDemoLogin();
    }
  }, [user]);

  // Redirect if already authenticated as staff
  useEffect(() => {
    if (authLoading) return;

    if (user && userRole && ['Superadmin', 'Admin', 'Coordinator', 'Therapist'].includes(userRole)) {
      router.replace("/");
    }
  }, [user, userRole, authLoading, router]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push("/");
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setError(t('auth.invalid_credentials'));
      } else {
        setError(t('auth.sign_in_error'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadData.consent) {
      setError("Vă rugăm să acceptați prelucrarea datelor.");
      return;
    }

    setIsLoading(true);
    try {
      // 1. Save to potential_clients
      await addDoc(collection(db, "potential_clients"), {
        ...leadData,
        createdAt: serverTimestamp(),
        source: "demo_platform_entry"
      });

      // 2. Proceed with demo login
      await handleDemoLogin();
    } catch (err) {
      console.error(err);
      setError("A apărut o eroare. Vă rugăm să încercați din nou.");
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);
    try {
      await signInAnonymous();
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Failed to access demo.");
    } finally {
      setIsLoading(false);
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      
      {/* Decorative Background Elements for Demo */}
      {IS_DEMO && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary-500/5 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary-500/5 rounded-full blur-[120px]" />
        </div>
      )}

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm z-10">
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

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 mb-6">
            <span className="text-white font-bold text-3xl font-display">T</span>
          </div>
          <h2 className="text-3xl font-semibold text-neutral-900 dark:text-white tracking-tight font-display">
            {IS_DEMO ? "TempoApp Demo" : t('auth.sign_in_title')}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {IS_DEMO 
              ? "Explorați viitorul managementului clinic" 
              : t('auth.sign_in_subtitle')}
          </p>
        </div>

        {IS_DEMO ? (
          /* DEMO VIEW */
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm space-y-6">
              {!showLeadForm ? (
                /* Welcome Screen */
                <>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="mt-1 bg-primary-100 dark:bg-primary-900/30 p-1.5 rounded-lg text-primary-600">
                        <Rocket className="w-4 h-4" />
                      </div>
                      <p>Aceasta este o versiune demonstrativă menită să prezinte interfața și fluxul de lucru.</p>
                    </div>
                    <div className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">
                      <div className="mt-1 bg-success-100 dark:bg-success-900/30 p-1.5 rounded-lg text-success-600">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <p>Platforma completă include securitate avansată, scalabilitate enterprise și suport tehnic dedicat.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowLeadForm(true)}
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-3 py-4 px-6 bg-primary-600 hover:bg-primary-700 text-white text-lg font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
                  >
                    ENTER PLATFORM
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </>
              ) : (
                /* Lead Capture Form */
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div className="text-center mb-6">
                    <h3 className="font-semibold text-neutral-900 dark:text-white font-display">Acces Demo</h3>
                    <p className="text-xs text-neutral-500">Vă rugăm să introduceți câteva detalii pentru a continua.</p>
                  </div>

                  <div className="space-y-3">
                    <input
                      type="text"
                      required
                      placeholder="Nume Complet"
                      value={leadData.name}
                      onChange={e => setLeadData({ ...leadData, name: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="email"
                      required
                      placeholder="Email"
                      value={leadData.email}
                      onChange={e => setLeadData({ ...leadData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Telefon"
                      value={leadData.phone}
                      onChange={e => setLeadData({ ...leadData, phone: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    />
                    <input
                      type="text"
                      required
                      placeholder="Nume Clinică"
                      value={leadData.clinic}
                      onChange={e => setLeadData({ ...leadData, clinic: e.target.value })}
                      className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer group mt-4">
                    <input
                      type="checkbox"
                      required
                      checked={leadData.consent}
                      onChange={e => setLeadData({ ...leadData, consent: e.target.checked })}
                      className="mt-1 w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-[10px] text-neutral-500 leading-tight group-hover:text-neutral-700 transition-colors">
                      Sunt de acord cu prelucrarea datelor mele personale în scopul prezentării ofertei comerciale TempoApp conform GDPR.
                    </span>
                  </label>

                  {error && (
                    <div className="text-xs text-error-600 bg-error-50 dark:bg-error-900/20 p-2 rounded-lg border border-error-100 dark:border-error-800">
                      {error}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowLeadForm(false)}
                      className="flex-1 py-3 px-4 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-bold rounded-xl hover:bg-neutral-50 transition-all"
                    >
                      Înapoi
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-[2] flex justify-center items-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all disabled:opacity-70"
                    >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "CONTINUĂ"}
                    </button>
                  </div>
                </form>
              )}
            </div>

            <p className="text-center text-xs text-neutral-500 dark:text-neutral-600 leading-relaxed px-4">
              Pentru implementări personalizate sau acces la varianta enterprise, vizitați 
              <a href="https://www.tempoapp.ro" className="text-primary-500 hover:underline ml-1 font-medium">www.tempoapp.ro</a>
            </p>
          </div>
        ) : (
          /* LIVE VIEW (Original Form) */
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-xl shadow-sm -space-y-px overflow-hidden border border-neutral-300 dark:border-neutral-700">
              <div>
                <label htmlFor="email-address" className="sr-only">{t('auth.email')}</label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  required
                  className="appearance-none relative block w-full px-4 py-4 placeholder-neutral-500 text-neutral-900 dark:text-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 sm:text-sm transition-all"
                  placeholder={t('auth.email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="border-t border-neutral-300 dark:border-neutral-700">
                <label htmlFor="password" className="sr-only">{t('auth.password')}</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none relative block w-full px-4 py-4 placeholder-neutral-500 text-neutral-900 dark:text-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 sm:text-sm transition-all"
                  placeholder={t('auth.password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-error-50 dark:bg-error-900/20 p-4 border border-error-200 dark:border-error-800 animate-in shake-200">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-error-500" />
                  <h3 className="text-sm font-medium text-error-800 dark:text-error-200">{error}</h3>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-neutral-900 dark:text-neutral-300">{t('auth.remember_me')}</label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500 dark:hover:text-primary-400">{t('auth.forgot_password')}</a>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-all shadow-lg shadow-primary-600/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.sign_in_button')}
            </button>

            <div className="text-center mt-4">
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('auth.is_parent')}{" "}
                <Link href="/parent/" className="font-medium text-primary-600 hover:text-primary-500 dark:hover:text-primary-400">
                  {t('auth.access_parent_portal')}
                </Link>
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
