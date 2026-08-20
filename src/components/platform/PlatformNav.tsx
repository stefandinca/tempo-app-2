"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { Building2, Bug, UserPlus, Sparkles, Activity } from "lucide-react";

const ITEMS = [
  { href: "/platform", icon: Building2, key: "clinics", label: "Clinics" },
  { href: "/platform/bug-reports", icon: Bug, key: "bug_reports", label: "Bug reports" },
  { href: "/platform/leads", icon: UserPlus, key: "leads", label: "Leads" },
  { href: "/platform/ai-usage", icon: Sparkles, key: "ai_usage", label: "Mira spend" },
  { href: "/platform/health", icon: Activity, key: "health", label: "Health" },
];

export default function PlatformNav() {
  const pathname = usePathname();
  const { t } = useTranslation();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-200 dark:border-neutral-800 px-4">
      {ITEMS.map((item) => {
        const active = item.href === "/platform" ? pathname === "/platform" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-2 px-4 py-3 min-h-[44px] text-sm font-semibold whitespace-nowrap border-b-2 transition-colors",
              active
                ? "border-primary-500 text-primary-600 dark:text-primary-400"
                : "border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200",
            )}
          >
            <Icon className="w-4 h-4" />
            {t(`platform.nav.${item.key}`, { defaultValue: item.label })}
          </Link>
        );
      })}
    </nav>
  );
}
