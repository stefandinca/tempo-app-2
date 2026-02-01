"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import MobileSidebar from "@/components/MobileSidebar";
import BottomNav from "@/components/BottomNav";

export default function DashboardShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Sidebar (Drawer) */}
      <MobileSidebar 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      {/* Main Content Area - Shifted by Sidebar Width */}
      <div className="lg:ml-64 min-h-screen flex flex-col pb-16 lg:pb-0">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        {children}
      </div>

      {/* Bottom Navigation (Mobile) */}
      <BottomNav />
    </div>
  );
}
