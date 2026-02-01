"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, KeyRound, ChevronRight } from "lucide-react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export default function ParentLoginPage() {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 4) {
      setError("Please enter a valid client code.");
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
        setError("Invalid client code. Please check and try again.");
        setIsLoading(false);
        return;
      }

      // Found the client
      const clientDoc = querySnapshot.docs[0];
      const clientData = clientDoc.data();
      
      // Store session
      localStorage.setItem("parent_client_code", code.toUpperCase());
      localStorage.setItem("parent_client_id", clientDoc.id);
      localStorage.setItem("parent_client_name", clientData.name);

      router.push(`/parent/dashboard/`);
    } catch (err: any) {
      console.error("Verification error:", err);
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-4">
      {/* Hidden marker for debug */}
      <span className="sr-only">PARENT_LOGIN_PAGE_ACTIVE</span>
      
      <div className="max-w-md w-full bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
        <div className="p-8 sm:p-12 text-center">
          {/* Logo */}
          <div className="mx-auto w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center text-primary-600 mb-6">
            <KeyRound className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
            Parent Portal Access
          </h1>
          <p className="text-neutral-500 text-sm mb-8">
            Enter the unique client code provided by your clinic to access your child&apos;s therapy journey.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter Client Code"
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
                  Access Portal
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-neutral-50 dark:bg-neutral-800/50 p-6 text-center border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 leading-relaxed">
            Don&apos;t have a code? Please contact your clinic administrator or therapy coordinator.
          </p>
                </div>
                          </div>
                          
                          <Link href="/login/" className="mt-8 text-sm text-neutral-500 hover:text-primary-600 transition-colors">
                            Staff Login
                          </Link>
                        </div>
                      );
                    }
                    