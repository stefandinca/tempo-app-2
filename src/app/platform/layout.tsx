"use client";

import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ACTIVE_DATABASE_ID } from "@/lib/firebase";
import { DEFAULT_DATABASE_ID } from "@/lib/tenant";
import PlatformNav from "@/components/platform/PlatformNav";

/**
 * The console shell.
 *
 * The checks here are signposting, not the boundary: every /api/platform route
 * re-checks the caller and the host server-side, because the bundle is shared
 * by every clinic and anything in the browser can be bypassed. What this
 * prevents is the console rendering somewhere it does not belong and looking
 * like it works.
 */
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, userRole, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  // The console reads the control plane. On a clinic's host `db` is bound to
  // that clinic, so this page is not merely unauthorised — it is meaningless.
  if (ACTIVE_DATABASE_ID !== DEFAULT_DATABASE_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-500 max-w-md">
          {t("platform.wrong_host", {
            defaultValue: "The platform console is served from superadmin.tempoapp.ro.",
          })}
        </p>
      </div>
    );
  }

  if (!user || String(userRole || "").toLowerCase() !== "superadmin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 text-center bg-neutral-50 dark:bg-neutral-950">
        <p className="text-neutral-500">
          {t("platform.not_authorised", { defaultValue: "Superadmin access only." })}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <header className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
        <div className="px-4 pt-4">
          <h1 className="text-lg font-bold text-neutral-900 dark:text-white">
            {t("platform.title", { defaultValue: "TempoApp Platform" })}
          </h1>
        </div>
        <PlatformNav />
      </header>
      <main className="p-4 lg:p-6">{children}</main>
    </div>
  );
}
