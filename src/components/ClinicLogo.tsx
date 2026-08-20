"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";

/**
 * The clinic's own logo, falling back to the TempoApp mark.
 *
 * A Superadmin uploads one per clinic (Settings > Branding), so a centre sees
 * its own identity rather than ours. The mark appears BEFORE anyone signs in —
 * the login screen, the password-reset screen — so `system_settings/branding` is
 * deliberately world-readable in firestore.rules. It holds a URL to an image
 * that is public by nature and nothing else.
 *
 * Every consumer subscribes, so replacing a logo updates open sessions rather
 * than waiting for a reload.
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
        // Never let branding break a screen. The fallback mark is always valid.
        console.warn("[ClinicLogo] branding read failed:", err);
        setState({ logoUrl: "", logoPath: "" });
        setLoading(false);
      },
    );
    return () => unsubscribe();
  }, []);

  return { ...state, loading };
}

const SIZES = {
  sm: { box: "w-8 h-8 rounded-lg", text: "text-lg" },
  md: { box: "w-12 h-12 rounded-xl", text: "text-2xl" },
  lg: { box: "w-16 h-16 rounded-2xl", text: "text-3xl" },
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

  // While the branding doc is still in flight, render the fallback rather than a
  // gap — the mark sits in a fixed slot and a blank would shift the layout.
  if (logoUrl && !loading) {
    return (
      <img
        src={logoUrl}
        alt=""
        className={clsx(s.box, "object-contain bg-white dark:bg-neutral-800", className)}
      />
    );
  }

  return (
    <div className={clsx(s.box, "bg-primary-500 flex items-center justify-center", className)}>
      <span className={clsx("text-white font-bold font-display", s.text)}>T</span>
    </div>
  );
}
