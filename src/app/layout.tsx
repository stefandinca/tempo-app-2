import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { DataProvider } from "@/context/DataContext";
import { EventModalProvider } from "@/context/EventModalContext";
import { CommandPaletteProvider } from "@/context/CommandPaletteContext";
import { ToastProvider } from "@/context/ToastContext";
import { NotificationProvider } from "@/context/NotificationContext";
import i18n from "@/lib/i18n";
import CommandPalette from "@/components/CommandPalette";

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