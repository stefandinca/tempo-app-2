"use client";

import { useState } from "react";
import { X, Search, Loader2 } from "lucide-react";
import { useTeamMembers } from "@/hooks/useCollections";
import { useAnyAuth } from "@/hooks/useAnyAuth";
import { useParentAuthOptional } from "@/context/ParentAuthContext";
import { useClient } from "@/hooks/useClient";
import { useData } from "@/context/DataContext";
import { ChatParticipant } from "@/types/chat";
import { useTranslation } from "react-i18next";

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartChat: (participant: ChatParticipant) => void;
}

export default function NewChatModal({ isOpen, onClose, onStartChat }: NewChatModalProps) {
  const { t } = useTranslation();
  const { user, isParent, isStaff } = useAnyAuth();
  const parentAuth = useParentAuthOptional();
  const { data: client } = useClient(parentAuth?.clientId || "");
  const { teamMembers, clients } = useData();
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const team = teamMembers.data || [];
  const allClients = clients.data || [];

  const filteredTeam = team.filter(member => {
    // Don't show self
    if (member.id === user?.uid) return false;

    // Search filter
    const matchesSearch = 
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      member.role?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    // If parent, only show relevant team members
    if (isParent) {
      const isAssigned = member.id === client?.assignedTherapistId;
      const isCoordinatorOrAdmin = member.role === "Coordinator" || member.role === "Admin";
      return isAssigned || isCoordinatorOrAdmin;
    }

    return true;
  });

  // If staff, also allow searching for parents
  const filteredParents: ChatParticipant[] = [];
  if (isStaff) {
    allClients.forEach(c => {
      // Show parents who have registered (have parentUids) OR have an access code
      if (c.parentUids?.length || c.clientCode) {
        const parentName = c.parentName || `Parent of ${c.name}`;
        if (parentName.toLowerCase().includes(searchQuery.toLowerCase()) || c.name.toLowerCase().includes(searchQuery.toLowerCase())) {
          // Use the most recent UID if available, otherwise use clientId as a placeholder 
          // (The parent will join this thread when they log in)
          const parentId = c.parentUids?.length ? c.parentUids[c.parentUids.length - 1] : c.id;
          
          filteredParents.push({
            id: parentId,
            name: parentName,
            initials: "P",
            color: "#4A90E2",
            role: "Parent",
            clientId: c.id,
            phone: c.phone
          });
        }
      }
    });
  }

  const loading = teamMembers.loading || clients.loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h3 className="font-bold text-lg text-neutral-900 dark:text-white">{t('chat.new_conversation')}</h3>
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
              placeholder={t('chat.search_contacts')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-neutral-500">
              <Loader2 className="w-8 h-8 animate-spin mb-2" />
              <p className="text-sm">{t('common.loading')}</p>
            </div>
          ) : (filteredTeam.length === 0 && filteredParents.length === 0) ? (
            <div className="py-12 text-center text-neutral-500">
              <p className="text-sm">{t('chat.no_contacts')}</p>
            </div>
          ) : (
            <>
              {filteredTeam.length > 0 && (
                <div className="px-3 py-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{t('nav.team')}</p>
                </div>
              )}
              {filteredTeam.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    onStartChat({
                      id: member.id,
                      name: member.name,
                      initials: member.initials,
                      color: member.color,
                      role: member.role,
                      phone: member.phone,
                      photoURL: member.photoURL
                    });
                  }}
                  className="w-full p-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors text-left"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden"
                    style={{ backgroundColor: member.photoURL ? 'transparent' : (member.color || '#ccc') }}
                  >
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.name} className="w-full h-full object-cover" />
                    ) : (
                      member.initials
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-neutral-900 dark:text-white">{member.name}</p>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{member.role}</p>
                  </div>
                </button>
              ))}

              {filteredParents.length > 0 && (
                <div className="px-3 py-2 mt-2">
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">{t('nav.clients')} (Parents)</p>
                </div>
              )}
              {filteredParents.map((parent) => (
                <button
                  key={parent.id}
                  onClick={() => onStartChat(parent)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-xl transition-colors text-left"
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 font-bold text-xs shadow-sm"
                  >
                    {parent.initials}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-neutral-900 dark:text-white">{parent.name}</p>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">{parent.role}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}