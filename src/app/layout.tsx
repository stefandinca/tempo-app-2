import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { EventModalProvider } from "@/context/EventModalContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import { ToastProvider } from "@/context/ToastContext";
import { NotificationProvider } from "@/context/NotificationContext";
import i18n from "@/lib/i18n";
import CommandPalette from "@/components/CommandPalette";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#4A90E2",
};

export const metadata: Metadata = {
  title: "TempoApp - Therapy Management",
  description: "Modern management for therapy centers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TempoApp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <body className={inter.className}>
        <ToastProvider>
          <AuthProvider>
            <DataProvider>
              <NotificationProvider>
                <EventModalProvider>
                  <CommandPaletteProvider>
                    {children}
                    <CommandPalette />
                  </CommandPaletteProvider>
                </EventModalProvider>
              </NotificationProvider>
            </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}