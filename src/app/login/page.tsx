"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AlertCircle, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await signIn(email, password);
      router.push("/"); // Redirect to dashboard on success
    } catch (err: any) {
      console.error(err);
      if (err.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError("Failed to sign in. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-neutral-900 dark:text-white">
            Sign in to TempoApp
          </h2>
          <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
            Welcome back, please enter your details.
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-neutral-300 dark:border-neutral-700 placeholder-neutral-500 text-neutral-900 dark:text-white dark:bg-neutral-800 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-neutral-300 dark:border-neutral-700 placeholder-neutral-500 text-neutral-900 dark:text-white dark:bg-neutral-800 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm transition-colors"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-md bg-error-50 dark:bg-error-900/20 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-error-400" aria-hidden="true" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-error-800 dark:text-error-200">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-neutral-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-neutral-900 dark:text-neutral-300"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <a
                href="#"
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Sign in"
              )}
            </button>
          </div>
        </form>

        {/* Parent Access Link */}
        <div className="text-center mt-4">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Are you a parent?{" "}
            <Link
              href="/parent/"
              className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
            >
              Access Parent Portal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
