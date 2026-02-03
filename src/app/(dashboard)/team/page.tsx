"use client";

import { useState, useEffect } from "react";
import TeamList from "@/components/team/TeamList";
import TeamMemberModal from "@/components/team/TeamMemberModal";
import { TeamMember } from "@/components/team/TeamMemberCard";

export default function TeamPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Check for pending action from command palette
  useEffect(() => {
    const action = sessionStorage.getItem("commandPaletteAction");
    if (action === "add-member") {
      sessionStorage.removeItem("commandPaletteAction");
      setTimeout(() => {
        setEditingMember(null);
        setIsModalOpen(true);
      }, 100);
    }
  }, []);

  const handleEdit = (member: TeamMember) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  return (
    <div className="flex-1 p-6 space-y-6">
      <TeamList onEdit={handleEdit} onAdd={handleAdd} />

      <TeamMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        memberToEdit={editingMember}
      />
    </div>
  );
}