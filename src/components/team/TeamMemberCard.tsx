"use client";

import { Edit, User, Mail, Calendar } from "lucide-react";
import { clsx } from "clsx";

export interface TeamMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  color: string;
  email: string;
  sessions?: number; // Optional stat
  clients?: number;  // Optional stat
  isActive?: boolean;
}

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
}

export default function TeamMemberCard({ member, onEdit }: TeamMemberCardProps) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-5 hover:shadow-md transition-all group relative">
      
      {/* Edit Button (Top Right) */}
      <button 
        onClick={() => onEdit(member)}
        className="absolute top-4 right-4 p-2 rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-500 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
      >
        <Edit className="w-4 h-4" />
      </button>

      {/* Header: Avatar & Name */}
      <div className="flex items-start gap-4 mb-4">
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-sm"
          style={{ backgroundColor: member.color || '#ccc' }}
        >
          {member.initials}
        </div>
        <div>
          <h3 className="font-bold text-lg text-neutral-900 dark:text-white leading-tight">{member.name}</h3>
          <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">{member.role}</p>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-500">
            <span className={clsx(
              "w-2 h-2 rounded-full",
              member.isActive !== false ? "bg-success-500" : "bg-neutral-300"
            )} />
            {member.isActive !== false ? "Active" : "Inactive"}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 border-t border-neutral-100 dark:border-neutral-800 pt-4">
        <div className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <Mail className="w-4 h-4 text-neutral-400" />
          <span className="truncate">{member.email || "No email"}</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <User className="w-4 h-4 text-neutral-400" />
          <span>{member.clients || 0} Active Clients</span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-400">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <span>{member.sessions || 0} Sessions / week</span>
        </div>
      </div>
    </div>
  );
}
