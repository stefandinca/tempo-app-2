"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clsx } from "clsx";
import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";

/**
 * The clinic's own branding, falling back to TempoApp's.
 *
 * A Superadmin uploads one logo per clinic (Settings > Branding), so a centre
 * sees its own identity rather than ours. It appears BEFORE anyone signs in —
 * the login screen, the password-reset screen, the parent portal — so
 * `system_settings/branding` is deliberately world-readable in firestore.rules.
 * It holds a URL to an image that is public by nature and nothing else.
 *
 * Two shapes, because the app brands in two different spaces:
 *
 *   ClinicLogo   a single mark, where a square tile sits today.
 *   ClinicBrand  the whole branding row — the mark AND the "TempoApp / Therapy
 *                Management" wordmark beside it. A clinic's logo replaces the
 *                entire row, since a real logo usually contains its own name and
 *                would read oddly next to ours.
 *
 * A custom logo is never forced into a square: its height is capped and the
 * width left free, so a wide wordmark keeps its proportions instead of being
 * letterboxed into a tile.
 */

export const BRANDING_DOC = "branding";

export interface ClinicBranding {
  logoUrl: string;
  logoPath: string;
  loading: boolean;
}

export function useClinicBranding(): ClinicBranding {
  const [state, setState] = useState<Omit<ClinicBranding, "loading">>({ logoUrl: "", logoPath: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, "system_settings", BRANDING_DOC),
      (snap) => {
        const d = snap.exists() ? snap.data() : null;
        setState({
          logoUrl: typeof d?.logoUrl === "string" ? d.logoUrl : "",
          logoPath: typeof d?.logoPath === "string" ? d.logoPath : "",
        });
        setLoading(false);
      },
      (err) => {
        // Never let branding break a screen. The fallback is always valid.
        console.warn("[ClinicLogo] branding read failed:", err);
        setState({ logoUrl: "", logoPath: "" });
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  return { ...state, loading };
}

/** Fallback tile geometry, and the height a custom logo is capped to. */
const SIZES = {
  sm: { box: "w-8 h-8 rounded-lg", text: "text-lg", logo: "h-8" },
  md: { box: "w-12 h-12 rounded-xl", text: "text-2xl", logo: "h-12" },
  lg: { box: "w-16 h-16 rounded-2xl", text: "text-3xl", logo: "h-16" },
} as const;

export default function ClinicLogo({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const { logoUrl, loading } = useClinicBranding();
  const s = SIZES[size];

  if (logoUrl && !loading) {
    return <img src={logoUrl} alt="" className={clsx(s.logo, "w-auto max-w-full object-contain", className)} />;
  }

  // Render the fallback while loading too — the mark sits in a fixed slot and a
  // blank would shift the layout every time a page opens.
  return (
    <div className={clsx(s.box, "bg-primary-500 flex items-center justify-center shrink-0 shadow-lg shadow-primary-500/20", className)}>
      <span className={clsx("text-white font-bold font-display", s.text)}>T</span>
    </div>
  );
}

/**
 * The full branding row. `subtitle` is the second line of the wordmark, present
 * in the desktop sidebar and absent in the mobile drawer.
 *
 * `fallback="none"` renders nothing when the clinic has no logo — for slots that
 * exist only to carry a clinic's mark, where TempoApp's wordmark would be an
 * addition rather than a fallback.
 */
export function ClinicBrand({
  subtitle = true,
  fallback = "brand",
  className,
  logoHeight = "h-10",
}: {
  subtitle?: boolean;
  fallback?: "brand" | "none";
  className?: string;
  logoHeight?: string;
}) {
  const { logoUrl, loading } = useClinicBranding();
  const { t } = useTranslation();

  if (logoUrl && !loading) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={clsx(logoHeight, "w-auto max-w-full object-contain", className)}
      />
    );
  }

  if (fallback === "none") return null;

  return (
    <div className={clsx("flex items-center gap-3 min-w-0", className)}>
      <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-lg font-display">T</span>
      </div>
      <div className="min-w-0">
        <h1 className="font-bold text-lg text-neutral-900 dark:text-white font-display truncate">
          {t("header.titles.app_title")}
        </h1>
        {subtitle && (
          <p className="text-xs text-neutral-500 truncate">{t("header.titles.app_subtitle")}</p>
        )}
      </div>
    </div>
  );
}
