"use client";

import { useState } from "react";
import { useData } from "@/context/DataContext";
import TeamMemberCard, { TeamMember } from "./TeamMemberCard";
import { TeamMemberCardSkeleton } from "@/components/ui/Skeleton";
import { Search, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface TeamListProps {
  onEdit: (member: TeamMember) => void;
  onAdd: () => void;
}

export default function TeamList({ onEdit, onAdd }: TeamListProps) {
  const { teamMembers } = useData();
  const loading = teamMembers.loading;
  const [search, setSearch] = useState("");
  const { userRole } = useAuth();

  const filteredMembers = teamMembers.data.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

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
            placeholder="Search team members..." 
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {userRole === 'Admin' && (
          <button 
            onClick={onAdd}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Member
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMembers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-neutral-500">
            No team members found.
          </div>
        ) : (
          filteredMembers.map((member: any) => (
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
