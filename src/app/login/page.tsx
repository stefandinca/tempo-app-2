"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Loader2, Play, Rocket, ShieldCheck, ArrowLeft, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import { IS_DEMO, db, auth as firebaseAuth } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle, signInAnonymous, user, userRole, loading: authLoading, authError } = useAuth();

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

  // Show auth errors from context (Google sign-in failures)
  useEffect(() => {
    if (authError === "google_not_authorized") {
      setError(t('auth.google_not_authorized'));
    } else if (authError === "account_needs_migration") {
      setError(t('auth.account_needs_migration'));
    }
  }, [authError, t]);

  // Redirect if already authenticated as staff (case-insensitive check)
  useEffect(() => {
    console.log("[Login Debug] useEffect:", { authLoading, userRole, hasUser: !!user });
    if (authLoading) return;

    const staffRoles = ['superadmin', 'admin', 'coordinator', 'therapist'];
    const hasStaffRole = userRole && staffRoles.includes(userRole.toLowerCase());

    console.log("[Login Debug] hasStaffRole:", hasStaffRole);
    if (user && hasStaffRole) {
      console.log("[Login Debug] Redirecting to /");
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
      // Don't router.push here — the useEffect handles redirect once userRole is set
      // This avoids a race condition where "/" redirects back to /login before userData loads
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

  const handleGoogleSignIn = async () => {
    setError("");
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      // onAuthStateChanged in AuthContext handles the rest
    } catch (err: any) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setError(t('auth.sign_in_error'));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await sendPasswordResetEmail(firebaseAuth, forgotEmail);
    } catch (err) {
      // Silently handle — don't reveal if email exists or not
      console.error(err);
    } finally {
      // Always show success message to prevent email enumeration
      setResetEmailSent(true);
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
            {IS_DEMO ? "TempoApp Demo" : (showForgotPassword ? t('auth.forgot_password_title') : t('auth.sign_in_title'))}
          </h2>
          <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
            {IS_DEMO
              ? "Explorați viitorul managementului clinic"
              : (showForgotPassword ? t('auth.forgot_password_subtitle') : t('auth.sign_in_subtitle'))}
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
        ) : showForgotPassword ? (
          /* FORGOT PASSWORD VIEW */
          <div className="mt-8 space-y-6">
            {resetEmailSent ? (
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto">
                  <Mail className="w-8 h-8 text-success-500" />
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {t('auth.reset_email_sent')}
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                    setForgotEmail("");
                  }}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('auth.back_to_sign_in')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div className="rounded-xl shadow-sm overflow-hidden border border-neutral-300 dark:border-neutral-700">
                  <label htmlFor="forgot-email" className="sr-only">{t('auth.email')}</label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none relative block w-full px-4 py-4 placeholder-neutral-500 text-neutral-900 dark:text-white dark:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:z-10 sm:text-sm transition-all"
                    placeholder={t('auth.email')}
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-error-50 dark:bg-error-900/20 p-4 border border-error-200 dark:border-error-800">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-error-500" />
                      <h3 className="text-sm font-medium text-error-800 dark:text-error-200">{error}</h3>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-all shadow-lg shadow-primary-600/20"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.send_reset_link')}
                </button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setError("");
                    }}
                    className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-500"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('auth.back_to_sign_in')}
                  </button>
                </div>
              </form>
            )}
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
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError("");
                    setForgotEmail(email);
                  }}
                  className="font-medium text-primary-600 hover:text-primary-500 dark:hover:text-primary-400"
                >
                  {t('auth.forgot_password')}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-4 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-all shadow-lg shadow-primary-600/20"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth.sign_in_button')}
            </button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-neutral-50 dark:bg-neutral-950 text-neutral-500">{t('auth.or')}</span>
              </div>
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-neutral-300 dark:border-neutral-700 text-sm font-bold rounded-xl text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-750 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-all"
            >
              {isGoogleLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {t('auth.sign_in_with_google')}
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
