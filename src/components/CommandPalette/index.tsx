"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { clsx } from "clsx";
import {
  Search,
  X,
  Calendar,
  CalendarPlus,
  Users,
  UserPlus,
  UserCircle,
  CreditCard,
  BarChart2,
  Settings,
  Bell,
  LayoutDashboard,
  FileText,
  ClipboardList,
  Briefcase,
  Plus,
  ArrowRight,
  Command
} from "lucide-react";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { useEventModal } from "@/context/EventModalContext";
import { useData } from "@/context/DataContext";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "action" | "navigation" | "client" | "team";
  shortcut?: string;
  action: () => void;
}

export default function CommandPalette() {
  const { isOpen, close } = useCommandPalette();
  const { openModal: openEventModal } = useEventModal();
  const { clients, teamMembers } = useData();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Navigation helper
  const navigateTo = useCallback((path: string, action?: string) => {
    close();
    if (action) {
      // Store action in sessionStorage for the target page to pick up
      sessionStorage.setItem("commandPaletteAction", action);
    }
    router.push(path);
  }, [close, router]);

  // Define all commands
  const allCommands: CommandItem[] = useMemo(() => {
    const actions: CommandItem[] = [
      {
        id: "new-event",
        label: "New Event",
        description: "Schedule a new therapy session",
        icon: <CalendarPlus className="w-4 h-4" />,
        category: "action",
        shortcut: "N",
        action: () => {
          close();
          openEventModal();
        }
      },
      {
        id: "new-client",
        label: "New Client",
        description: "Add a new client to the system",
        icon: <UserPlus className="w-4 h-4" />,
        category: "action",
        shortcut: "C",
        action: () => navigateTo("/clients", "add-client")
      },
      {
        id: "new-team-member",
        label: "New Team Member",
        description: "Add a therapist or staff member",
        icon: <UserCircle className="w-4 h-4" />,
        category: "action",
        action: () => navigateTo("/team", "add-member")
      },
      {
        id: "new-invoice",
        label: "New Invoice",
        description: "Create a billing invoice",
        icon: <FileText className="w-4 h-4" />,
        category: "action",
        action: () => navigateTo("/billing", "new-invoice")
      },
      {
        id: "new-service",
        label: "New Service",
        description: "Add a new service type",
        icon: <Briefcase className="w-4 h-4" />,
        category: "action",
        action: () => navigateTo("/services", "add-service")
      },
      {
        id: "new-evaluation",
        label: "New Evaluation",
        description: "Schedule a client evaluation",
        icon: <ClipboardList className="w-4 h-4" />,
        category: "action",
        action: () => {
          close();
          openEventModal(); // Opens event modal - user can select "Evaluation" type
        }
      }
    ];

    const navigation: CommandItem[] = [
      {
        id: "nav-dashboard",
        label: "Dashboard",
        description: "Go to dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G D",
        action: () => navigateTo("/")
      },
      {
        id: "nav-calendar",
        label: "Calendar",
        description: "View calendar",
        icon: <Calendar className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G C",
        action: () => navigateTo("/calendar")
      },
      {
        id: "nav-clients",
        label: "Clients",
        description: "Manage clients",
        icon: <Users className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G L",
        action: () => navigateTo("/clients")
      },
      {
        id: "nav-team",
        label: "Team",
        description: "Manage team members",
        icon: <UserCircle className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G T",
        action: () => navigateTo("/team")
      },
      {
        id: "nav-billing",
        label: "Billing",
        description: "Invoices and payments",
        icon: <CreditCard className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G B",
        action: () => navigateTo("/billing")
      },
      {
        id: "nav-analytics",
        label: "Analytics",
        description: "View reports and insights",
        icon: <BarChart2 className="w-4 h-4" />,
        category: "navigation",
        action: () => navigateTo("/analytics")
      },
      {
        id: "nav-services",
        label: "Services",
        description: "Manage service types",
        icon: <Briefcase className="w-4 h-4" />,
        category: "navigation",
        action: () => navigateTo("/services")
      },
      {
        id: "nav-settings",
        label: "Settings",
        description: "App settings",
        icon: <Settings className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G S",
        action: () => navigateTo("/settings")
      },
      {
        id: "nav-notifications",
        label: "Notifications",
        description: "View all notifications",
        icon: <Bell className="w-4 h-4" />,
        category: "navigation",
        action: () => navigateTo("/notifications")
      }
    ];

    // Dynamic client search results
    const clientItems: CommandItem[] = (clients.data || []).map(client => ({
      id: `client-${client.id}`,
      label: client.name,
      description: "Client",
      icon: <Users className="w-4 h-4" />,
      category: "client" as const,
      action: () => navigateTo(`/clients/profile?id=${client.id}`)
    }));

    // Dynamic team member search results
    const teamItems: CommandItem[] = (teamMembers.data || []).map(member => ({
      id: `team-${member.id}`,
      label: member.name,
      description: member.role || "Team Member",
      icon: <UserCircle className="w-4 h-4" />,
      category: "team" as const,
      action: () => navigateTo("/team")
    }));

    return [...actions, ...navigation, ...clientItems, ...teamItems];
  }, [clients.data, teamMembers.data, close, openEventModal, navigateTo]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      // Show actions and navigation when no query
      return allCommands.filter(cmd =>
        cmd.category === "action" || cmd.category === "navigation"
      );
    }

    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd =>
      cmd.label.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery)
    );
  }, [allCommands, query]);

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {
      action: [],
      navigation: [],
      client: [],
      team: []
    };

    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });

    return groups;
  }, [filteredCommands]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < filteredCommands.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev > 0 ? prev - 1 : filteredCommands.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    }
  };

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: { [key: string]: string } = {
    action: "Quick Actions",
    navigation: "Navigation",
    client: "Clients",
    team: "Team Members"
  };

  const categoryOrder = ["action", "navigation", "client", "team"];
  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg mx-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or type a command..."
              className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 text-sm"
              autoComplete="off"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div
            ref={listRef}
            className="max-h-80 overflow-y-auto p-2"
          >
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              categoryOrder.map(category => {
                const items = groupedCommands[category];
                if (items.length === 0) return null;

                return (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-neutral-500 uppercase tracking-wide">
                      {categoryLabels[category]}
                    </div>
                    {items.map(item => {
                      const itemIndex = globalIndex++;
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <button
                          key={item.id}
                          data-index={itemIndex}
                          onClick={() => item.action()}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={clsx(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors",
                            isSelected
                              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"
                              : "hover:bg-neutral-100 dark:hover:bg-neutral-700/50"
                          )}
                        >
                          <div className={clsx(
                            "flex-shrink-0",
                            isSelected ? "text-primary-500" : "text-neutral-400"
                          )}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={clsx(
                              "text-sm font-medium truncate",
                              isSelected ? "" : "text-neutral-700 dark:text-neutral-200"
                            )}>
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="text-xs text-neutral-500 truncate">
                                {item.description}
                              </div>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-500 rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && (
                            <ArrowRight className="w-4 h-4 text-primary-500 flex-shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer hint */}
          <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">↑↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">↵</kbd>
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">esc</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
