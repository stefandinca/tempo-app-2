"use client";

import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useTeamMembers } from "@/hooks/useCollections";
import { useAuth } from "@/context/AuthContext";
import { ChatParticipant } from "@/types/chat";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (participant: ChatParticipant) => void;
}

export default function NewChatModal({ isOpen, onClose, onStartChat }: NewChatModalProps) {
  const { user } = useAuth();
  const { data: team, loading } = useTeamMembers();
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const filteredTeam = team.filter(member => 
    member.id !== user?.uid && 
    (member.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
     member.role?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-neutral-900 dark:text-white">New Conversation</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input 
              type="text" 
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {/* Team List */}
        <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">Loading team...</p>
            </div>
          ) : filteredTeam.length === 0 ? (
            <div className="py-12 text-center text-neutral-500">
              <p className="text-sm">No team members found.</p>
            </div>
          ) : (
            filteredTeam.map((member) => (
              <button
                key={member.id}
                onClick={() => {
                  onStartChat({
                    id: member.id,
                    name: member.name,
                    initials: member.initials,
                    color: member.color,
                    role: member.role
                  });
                }}
                className="w-full p-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors text-left"
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                  style={{ backgroundColor: member.color || '#ccc' }}
                >
                  {member.initials}
                </div>
                <div>
                  <p className="font-bold text-sm text-neutral-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{member.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
