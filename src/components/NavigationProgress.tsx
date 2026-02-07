"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // When pathname changes, navigation is complete — finish the bar
  useEffect(() => {
    if (!visible) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    setProgress(100);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 300);
  }, [pathname, searchParams]);

  // Intercept link clicks to detect navigation start
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (
        !href ||
        href.startsWith("http") ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        anchor.hasAttribute("download") ||
        anchor.getAttribute("target") === "_blank"
      ) {
        return;
      }

      // Don't trigger for same page
      if (href === pathname || href === pathname + "/") return;

      // Start progress
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setVisible(true);
      setProgress(20);

      // Slowly increment
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + (90 - prev) * 0.1;
        });
      }, 200);
    };

    document.addEventListener("click", handleClick, true);
    return () => {
      document.removeEventListener("click", handleClick, true);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-[3px]">
      <div
        className="h-full bg-primary-500 shadow-[0_0_8px_rgba(74,144,226,0.4)] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "400ms",
          opacity: progress === 100 ? 0 : 1,
        }}
      />
    </div>
  );
}
