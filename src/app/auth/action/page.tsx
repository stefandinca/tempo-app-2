"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { Loader2, CheckCircle2, AlertCircle, Lock, Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

export default function AuthActionPage() {
  const { t, i18n } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();

  const mode = searchParams.get("mode");
  const oobCode = searchParams.get("oobCode");

  const [status, setStatus] = useState<"verifying" | "ready" | "submitting" | "success" | "error">("verifying");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [validationError, setValidationError] = useState("");
  const [countdown, setCountdown] = useState(5);

  // Verify the oobCode on mount
  useEffect(() => {
    if (mode !== "resetPassword" || !oobCode) {
      setStatus("error");
      setErrorMessage(t("auth_action.invalid_link"));
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((userEmail) => {
        setEmail(userEmail);
        setStatus("ready");
      })
      .catch((err) => {
        console.error("verifyPasswordResetCode error:", err);
        if (err.code === "auth/expired-action-code") {
          setErrorMessage(t("auth_action.expired_link"));
        } else {
          setErrorMessage(t("auth_action.invalid_link"));
        }
        setStatus("error");
      });
  }, [mode, oobCode, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError("");

    if (password.length < 8) {
      setValidationError(t("auth_action.password_min_length"));
      return;
    }
    if (password !== confirmPassword) {
      setValidationError(t("auth_action.passwords_dont_match"));
      return;
    }

    setStatus("submitting");
    try {
      await confirmPasswordReset(auth, oobCode!, password);
      setStatus("success");
    } catch (err: any) {
      console.error("confirmPasswordReset error:", err);
      if (err.code === "auth/weak-password") {
        setValidationError(t("auth_action.password_min_length"));
        setStatus("ready");
      } else if (err.code === "auth/expired-action-code") {
        setErrorMessage(t("auth_action.expired_link"));
        setStatus("error");
      } else {
        setErrorMessage(t("auth_action.error_setting_password"));
        setStatus("error");
      }
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Auto-redirect to login after successful password reset
  useEffect(() => {
    if (status !== "success") return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/login");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 sm:px-6 lg:px-8 relative">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-white dark:bg-neutral-900 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm z-10">
        <button
          onClick={() => changeLanguage("ro")}
          className={clsx(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
            i18n.language.startsWith("ro")
              ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
              : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          )}
        >
          RO
        </button>
        <button
          onClick={() => changeLanguage("en")}
          className={clsx(
            "px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
            i18n.language.startsWith("en")
              ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
              : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          )}
        >
          EN
        </button>
      </div>

      <div className="max-w-md w-full space-y-8">
        {/* Logo */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center shadow-xl shadow-primary-500/20 mb-6">
            <span className="text-white font-bold text-3xl font-display">T</span>
          </div>
        </div>

        {/* Verifying State */}
        {status === "verifying" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">{t("auth_action.verifying_link")}</p>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-error-100 dark:bg-error-900/30 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-error-500" />
            </div>
            <p className="text-neutral-800 dark:text-neutral-200 font-medium">{errorMessage}</p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors"
            >
              {t("auth_action.go_to_sign_in")}
            </Link>
          </div>
        )}

        {/* Password Form */}
        {(status === "ready" || status === "submitting") && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white font-display">
                {t("auth_action.title")}
              </h2>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                {t("auth_action.subtitle")}
              </p>
              {email && (
                <p className="mt-1 text-sm font-medium text-primary-600 dark:text-primary-400">{email}</p>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                  {t("auth_action.new_password")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-10 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">
                  {t("auth_action.confirm_password")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full pl-10 pr-3 py-3 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              {validationError && (
                <div className="rounded-xl bg-error-50 dark:bg-error-900/20 p-3 border border-error-200 dark:border-error-800">
                  <p className="text-sm text-error-700 dark:text-error-300">{validationError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all disabled:opacity-70"
              >
                {status === "submitting" ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {t("auth_action.resetting")}
                  </>
                ) : (
                  t("auth_action.set_password")
                )}
              </button>
            </form>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm text-center space-y-4">
            <div className="w-16 h-16 bg-success-100 dark:bg-success-900/30 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success-500" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white font-display">
              {t("auth_action.success_title")}
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400">{t("auth_action.success_message")}</p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t("auth_action.redirecting_in", { seconds: countdown })}
            </p>
            <Link
              href="/login"
              className="inline-block mt-4 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-primary-600/20"
            >
              {t("auth_action.go_to_sign_in")}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
