"use client";

import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import TeamMemberCard, { TeamMember } from "./TeamMemberCard";
import { TeamMemberCardSkeleton } from "@/components/ui/Skeleton";
import { Search, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

interface TeamListProps {
  onEdit: (member: TeamMember) => void;
  onAdd: () => void;
}

export default function TeamList({ onEdit, onAdd }: TeamListProps) {
  const { t } = useTranslation();
  const { teamMembers, clients, events } = useData();
  const loading = teamMembers.loading;
  const [search, setSearch] = useState("");
  const { userRole } = useAuth();

  const filteredMembers = teamMembers.data
    .filter(m => m.role !== 'Superadmin')
    .filter(m =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.role.toLowerCase().includes(search.toLowerCase())
    );

  // Calculate dynamic stats for each member
  const membersWithStats = useMemo(() => {
    return filteredMembers.map(member => {
      // 1. Active Clients count
      const activeClients = clients.data.filter(c => c.assignedTherapistId === member.id && !c.isArchived).length;

      // 2. Sessions per week (last 7 days)
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const sessionsPerWeek = events.data.filter(e => 
        e.therapistId === member.id && 
        new Date(e.startTime) >= oneWeekAgo
      ).length;

      return {
        ...member,
        clients: activeClients,
        sessions: sessionsPerWeek
      } as TeamMember;
    });
  }, [filteredMembers, clients.data, events.data]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="w-full sm:w-96 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
          <div className="w-32 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl animate-pulse" />
        </div>
        {/* Skeleton Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <TeamMemberCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input 
            type="text" 
            placeholder={t('team.search_placeholder')}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {(userRole === 'Admin' || userRole === 'Superadmin') && (
          <button 
            onClick={onAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('team.add_member')}
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {membersWithStats.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-500">
            {t('team.no_results')}
          </div>
        ) : (
          membersWithStats.map((member) => (
            <TeamMemberCard 
              key={member.id} 
              member={member} 
              onEdit={onEdit} 
            />
          ))
        )}
      </div>
    </div>
  );
}