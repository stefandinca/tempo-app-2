"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";
import {
  Search,
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
  ArrowRight,
  MessageSquare,
  Eye,
  FileBarChart,
  Stethoscope,
  Target
} from "lucide-react";
import { useCommandPalette } from "@/context/CommandPaletteContext";
import { useEventModal } from "@/context/EventModalContext";
import { useData } from "@/context/DataContext";
import { useServices } from "@/hooks/useCollections";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: "action" | "navigation" | "client" | "client-action" | "team";
  shortcut?: string;
  action: () => void;
  clientId?: string; 
}

export default function CommandPalette() {
  const { t } = useTranslation();
  const { isOpen, close } = useCommandPalette();
  const { openModal: openEventModal } = useEventModal();
  const { clients, teamMembers } = useData();
  const { data: services } = useServices();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const navigateTo = useCallback((path: string, action?: string) => {
    close();
    if (action) {
      sessionStorage.setItem("commandPaletteAction", action);
    }
    router.push(path);
  }, [close, router]);

  const allCommands: CommandItem[] = useMemo(() => {
    const actions: CommandItem[] = [
      {
        id: "send-message",
        label: t('command_palette.actions.send_message.label'),
        description: t('command_palette.actions.send_message.desc'),
        icon: <MessageSquare className="w-4 h-4" />,
        category: "action",
        shortcut: "M",
        action: () => navigateTo("/messages", "new-message")
      },
      {
        id: "new-event",
        label: t('command_palette.actions.new_event.label'),
        description: t('command_palette.actions.new_event.desc'),
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
        label: t('command_palette.actions.new_client.label'),
        description: t('command_palette.actions.new_client.desc'),
        icon: <UserPlus className="w-4 h-4" />,
        category: "action",
        shortcut: "C",
        action: () => navigateTo("/clients", "add-client")
      },
      {
        id: "new-team-member",
        label: t('command_palette.actions.new_team.label'),
        description: t('command_palette.actions.new_team.desc'),
        icon: <UserCircle className="w-4 h-4" />,
        category: "action",
        action: () => navigateTo("/team", "add-member")
      },
      {
        id: "new-invoice",
        label: t('command_palette.actions.new_invoice.label'),
        description: t('command_palette.actions.new_invoice.desc'),
        icon: <FileText className="w-4 h-4" />,
        category: "action",
        action: () => navigateTo("/billing", "new-invoice")
      },
      {
        id: "new-service",
        label: t('command_palette.actions.new_service.label'),
        description: t('command_palette.actions.new_service.desc'),
        icon: <Briefcase className="w-4 h-4" />,
        category: "action",
        action: () => navigateTo("/services", "add-service")
      },
      {
        id: "new-evaluation",
        label: t('command_palette.actions.new_evaluation.label'),
        description: t('command_palette.actions.new_evaluation.desc'),
        icon: <ClipboardList className="w-4 h-4" />,
        category: "action",
        action: () => {
          close();
          openEventModal();
        }
      }
    ];

    const navigation: CommandItem[] = [
      {
        id: "nav-dashboard",
        label: t('nav.dashboard'),
        description: t('command_palette.categories.navigation'),
        icon: <LayoutDashboard className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G D",
        action: () => navigateTo("/")
      },
      {
        id: "nav-calendar",
        label: t('nav.calendar'),
        description: t('command_palette.categories.navigation'),
        icon: <Calendar className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G C",
        action: () => navigateTo("/calendar")
      },
      {
        id: "nav-clients",
        label: t('nav.clients'),
        description: t('command_palette.categories.navigation'),
        icon: <Users className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G L",
        action: () => navigateTo("/clients")
      },
      {
        id: "nav-team",
        label: t('nav.team'),
        description: t('command_palette.categories.navigation'),
        icon: <UserCircle className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G T",
        action: () => navigateTo("/team")
      },
      {
        id: "nav-billing",
        label: t('nav.billing'),
        description: t('command_palette.categories.navigation'),
        icon: <CreditCard className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G B",
        action: () => navigateTo("/billing")
      },
      {
        id: "nav-analytics",
        label: t('nav.analytics'),
        description: t('command_palette.categories.navigation'),
        icon: <BarChart2 className="w-4 h-4" />,
        category: "navigation",
        action: () => navigateTo("/analytics")
      },
      {
        id: "nav-services",
        label: t('nav.services'),
        description: t('command_palette.categories.navigation'),
        icon: <Briefcase className="w-4 h-4" />,
        category: "navigation",
        action: () => navigateTo("/services")
      },
      {
        id: "nav-settings",
        label: t('nav.settings'),
        description: t('command_palette.categories.navigation'),
        icon: <Settings className="w-4 h-4" />,
        category: "navigation",
        shortcut: "G S",
        action: () => navigateTo("/settings")
      },
      {
        id: "nav-notifications",
        label: t('notifications.title'),
        description: t('command_palette.categories.navigation'),
        icon: <Bell className="w-4 h-4" />,
        category: "navigation",
        action: () => navigateTo("/notifications")
      }
    ];

    const evaluationService = services.find(s =>
      s.label?.toLowerCase().includes('evaluation') ||
      s.label?.toLowerCase().includes('evaluare')
    );

    const clientItems: CommandItem[] = [];

    (clients.data || []).forEach(client => {
      const name = client.name;
      
      clientItems.push({
        id: `client-view-${client.id}`,
        label: t('command_palette.client_actions.view_profile', { name }),
        description: t('command_palette.client_actions.view_profile_desc'),
        icon: <Eye className="w-4 h-4" />,
        category: "client-action" as const,
        clientId: client.id,
        action: () => navigateTo(`/clients/profile?id=${client.id}`)
      });

      clientItems.push({
        id: `client-calendar-${client.id}`,
        label: t('command_palette.client_actions.view_calendar', { name }),
        description: t('command_palette.client_actions.view_calendar_desc'),
        icon: <Calendar className="w-4 h-4" />,
        category: "client-action" as const,
        clientId: client.id,
        action: () => navigateTo(`/calendar?clientId=${client.id}`)
      });

      clientItems.push({
        id: `client-schedule-${client.id}`,
        label: t('command_palette.client_actions.schedule_session', { name }),
        description: t('command_palette.client_actions.schedule_session_desc'),
        icon: <CalendarPlus className="w-4 h-4" />,
        category: "client-action" as const,
        clientId: client.id,
        action: () => {
          close();
          openEventModal({ clientId: client.id });
        }
      });

      clientItems.push({
        id: `client-evaluation-${client.id}`,
        label: t('command_palette.client_actions.new_evaluation', { name }),
        description: t('command_palette.client_actions.new_evaluation_desc'),
        icon: <Stethoscope className="w-4 h-4" />,
        category: "client-action" as const,
        clientId: client.id,
        action: () => {
          close();
          openEventModal({
            clientId: client.id,
            eventType: evaluationService?.id || "",
            title: `Evaluation - ${client.name}`
          });
        }
      });

      clientItems.push({
        id: `client-plan-${client.id}`,
        label: t('command_palette.client_actions.create_plan', { name }),
        description: t('command_palette.client_actions.create_plan_desc'),
        icon: <Target className="w-4 h-4" />,
        category: "client-action" as const,
        clientId: client.id,
        action: () => navigateTo(`/clients/profile?id=${client.id}&tab=plan&action=create-plan`)
      });

      clientItems.push({
        id: `client-report-${client.id}`,
        label: t('command_palette.client_actions.generate_report', { name }),
        description: t('command_palette.client_actions.generate_report_desc'),
        icon: <FileBarChart className="w-4 h-4" />,
        category: "client-action" as const,
        clientId: client.id,
        action: () => navigateTo(`/clients/profile?id=${client.id}&action=generate-report`)
      });

      clientItems.push({
        id: `client-docs-${client.id}`,
        label: t('command_palette.client_actions.view_docs', { name }),
        description: t('command_palette.client_actions.view_docs_desc'),
        icon: <FileText className="w-4 h-4" />,
        category: "client-action" as const,
        clientId: client.id,
        action: () => navigateTo(`/clients/profile?id=${client.id}&tab=docs`)
      });
    });

    const teamItems: CommandItem[] = (teamMembers.data || []).map(member => ({
      id: `team-${member.id}`,
      label: member.name,
      description: member.role || t('command_palette.categories.team'),
      icon: <UserCircle className="w-4 h-4" />,
      category: "team" as const,
      action: () => navigateTo("/team")
    }));

    return [...actions, ...navigation, ...clientItems, ...teamItems];
  }, [clients.data, teamMembers.data, services, close, openEventModal, navigateTo, t]);

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands.filter(cmd =>
        cmd.category === "action" || cmd.category === "navigation"
      );
    }
    const lowerQuery = query.toLowerCase();
    const matchingClients: string[] = [];
    (clients.data || []).forEach(client => {
      if (client.name.toLowerCase().includes(lowerQuery)) {
        matchingClients.push(client.id);
      }
    });
    const limitedClientIds = new Set(matchingClients.slice(0, 3));
    return allCommands.filter(cmd => {
      if (cmd.category === "client-action") {
        return cmd.clientId ? limitedClientIds.has(cmd.clientId) : false;
      }
      return cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description?.toLowerCase().includes(lowerQuery);
    });
  }, [allCommands, query, clients.data]);

  const groupedCommands = useMemo(() => {
    const groups: { [key: string]: CommandItem[] } = {
      action: [],
      navigation: [],
      "client-action": [],
      client: [],
      team: []
    };
    filteredCommands.forEach(cmd => {
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

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

  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: { [key: string]: string } = {
    action: t('command_palette.categories.action'),
    navigation: t('command_palette.categories.navigation'),
    "client-action": t('command_palette.categories.client_action'),
    client: t('command_palette.categories.client'),
    team: t('command_palette.categories.team')
  };

  const categoryOrder = ["action", "client-action", "navigation", "client", "team"];
  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={close} />
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg mx-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <Search className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('command_palette.placeholder')}
              className="flex-1 bg-transparent border-none outline-none text-neutral-900 dark:text-white placeholder-neutral-400 text-sm"
              autoComplete="off"
            />
            <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 rounded">
              ESC
            </kbd>
          </div>

          <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
            {filteredCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{t('command_palette.no_results', { query })}</p>
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
                          <div className={clsx("flex-shrink-0", isSelected ? "text-primary-500" : "text-neutral-400")}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className={clsx("text-sm font-medium truncate", isSelected ? "" : "text-neutral-700 dark:text-neutral-200")}>
                              {item.label}
                            </div>
                            {item.description && (
                              <div className="text-xs text-neutral-500 truncate">{item.description}</div>
                            )}
                          </div>
                          {item.shortcut && (
                            <kbd className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-500 rounded">
                              {item.shortcut}
                            </kbd>
                          )}
                          {isSelected && <ArrowRight className="w-4 h-4 text-primary-500 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="flex items-center gap-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">↑↓</kbd>
                {t('command_palette.hints.navigate')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">↵</kbd>
                {t('command_palette.hints.select')}
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded">esc</kbd>
                {t('command_palette.hints.close')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}