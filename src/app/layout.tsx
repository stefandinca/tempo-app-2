import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ParentAuthProvider } from "@/context/ParentAuthContext";
import { DataProvider } from "@/context/DataContext";
import { EventModalProvider } from "@/context/EventModalContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import { ToastProvider } from "@/context/ToastContext";
import { NotificationProvider } from "@/context/NotificationContext";
import i18n from "@/lib/i18n";
import CommandPalette from "@/components/CommandPalette";
import NavigationProgress from "@/components/NavigationProgress";
import { Suspense } from "react";

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-inter',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: '--font-plus-jakarta',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: "TempoApp - Therapy Management",
  description: "Modern management for therapy centers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TempoApp",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#4A90E2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased`}>
        {/* Preloader — inline HTML/CSS, renders before any JS loads */}
        <div
          id="preloader"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#FAFAFA",
            transition: "opacity 0.4s ease, visibility 0.4s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                background: "#4A90E2",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontWeight: 700,
                fontSize: "22px",
                fontFamily: "var(--font-plus-jakarta), sans-serif",
              }}
            >
              T
            </div>
            <span
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#171717",
                fontFamily: "var(--font-plus-jakarta), sans-serif",
              }}
            >
              TempoApp
            </span>
          </div>
          {/* Progress bar */}
          <div
            style={{
              width: "160px",
              height: "3px",
              background: "#E5E5E5",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "40%",
                height: "100%",
                background: "#4A90E2",
                borderRadius: "3px",
                animation: "preloader-bar 1.2s ease-in-out infinite",
              }}
            />
          </div>
        </div>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @keyframes preloader-bar {
                0% { transform: translateX(-100%); }
                50% { transform: translateX(150%); }
                100% { transform: translateX(400%); }
              }
              #preloader.fade-out {
                opacity: 0 !important;
                visibility: hidden !important;
              }
            `,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var done = false;
                function hide() {
                  if (done) return;
                  done = true;
                  var el = document.getElementById('preloader');
                  if (el) { el.classList.add('fade-out'); setTimeout(function() { el.style.display = 'none'; }, 500); }
                }
                window.addEventListener('load', function() { setTimeout(hide, 200); });
                setTimeout(hide, 6000);
              })();
            `,
          }}
        />
        <ToastProvider>
          <AuthProvider>
            <ParentAuthProvider>
              <NotificationProvider>
                <Suspense fallback={null}>
                  <NavigationProgress />
                </Suspense>
                {children}
              </NotificationProvider>
            </ParentAuthProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}