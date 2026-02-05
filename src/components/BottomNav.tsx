"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  User,
  Plus
} from "lucide-react";
import { clsx } from "clsx";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 lg:hidden z-30 flex items-center justify-around px-2 pb-safe">
      <Link 
        href="/" 
        className={clsx(
          "flex flex-col items-center gap-1 p-2 min-w-[64px]",
          pathname === "/" ? "text-primary-500" : "text-neutral-400"
        )}
      >
        <LayoutDashboard className="w-5 h-5" />
        <span className="text-[10px] font-medium">Home</span>
      </Link>

      <Link 
        href="/calendar/" 
        className={clsx(
          "flex flex-col items-center gap-1 p-2 min-w-[64px]",
          pathname === "/calendar/" ? "text-primary-500" : "text-neutral-400"
        )}
      >
        <Calendar className="w-5 h-5" />
        <span className="text-[10px] font-medium">Calendar</span>
      </Link>

      {/* Floating Action Button (FAB) Style for Main Action */}
      <button className="flex items-center justify-center w-12 h-12 -mt-6 bg-primary-500 rounded-full shadow-lg text-white hover:bg-primary-600 transition-colors">
        <Plus className="w-6 h-6" />
      </button>

      <Link 
        href="/clients/" 
        className={clsx(
          "flex flex-col items-center gap-1 p-2 min-w-[64px]",
          pathname === "/clients/" ? "text-primary-500" : "text-neutral-400"
        )}
      >
        <Users className="w-5 h-5" />
        <span className="text-[10px] font-medium">Clients</span>
      </Link>

      <Link 
        href="/settings" 
        className={clsx(
          "flex flex-col items-center gap-1 p-2 min-w-[64px]",
          pathname === "/settings" ? "text-primary-500" : "text-neutral-400"
        )}
      >
        <User className="w-5 h-5" />
        <span className="text-[10px] font-medium">Profile</span>
      </Link>
    </nav>
  );
}
