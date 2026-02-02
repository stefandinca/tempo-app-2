import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { EventModalProvider } from "@/context/EventModalContext";
import { ToastProvider } from "@/context/ToastContext";
import { NotificationProvider } from "@/context/NotificationContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TempoApp - Therapy Management",
  description: "Modern management for therapy centers",
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
            <NotificationProvider>
              <EventModalProvider>
                {children}
              </EventModalProvider>
            </NotificationProvider>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}