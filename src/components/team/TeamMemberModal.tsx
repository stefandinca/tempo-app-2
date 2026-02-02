"use client";

import { useState, useEffect } from "react";
import { X, Loader2, Check } from "lucide-react";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { doc, setDoc, updateDoc, collection } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { TeamMember } from "./TeamMemberCard";

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: TeamMember | null;
}

const ROLES = ["Admin", "Coordinator", "Senior ABA Therapist", "ABA Therapist", "Speech Therapist", "Occupational Therapist"];
const COLORS = ["#4A90E2", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#06B6D4", "#84CC16", "#F97316"];

export default function TeamMemberModal({ isOpen, onClose, memberToEdit }: TeamMemberModalProps) {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: ROLES[3],
    color: COLORS[0],
    isActive: true,
    baseSalary: "",
    defaultBonus: ""
  });

  // Reset or populate form
  useEffect(() => {
    if (isOpen) {
      if (memberToEdit) {
        setFormData({
          name: memberToEdit.name,
          email: memberToEdit.email,
          role: memberToEdit.role,
          color: memberToEdit.color,
          isActive: memberToEdit.isActive !== false,
          baseSalary: (memberToEdit as any).baseSalary || "",
          defaultBonus: (memberToEdit as any).defaultBonus || ""
        });
      } else {
        setFormData({
          name: "",
          email: "",
          role: ROLES[3],
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          isActive: true,
          baseSalary: "",
          defaultBonus: ""
        });
      }
    }
  }, [isOpen, memberToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const initials = formData.name
        .split(" ")
        .map(n => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

      const payload = {
        ...formData,
        baseSalary: parseFloat(formData.baseSalary) || 0,
        defaultBonus: parseFloat(formData.defaultBonus) || 0,
        initials
      };

      if (memberToEdit) {
        // Update
        await updateDoc(doc(db, "team_members", memberToEdit.id), payload);
        success("Team member updated");
      } else {
        // Create (use email as ID or auto-id? Auto-id is safer, but linking to Auth requires ID mapping. 
        // For now, let's use auto-id)
        const newRef = doc(collection(db, "team_members"));
        await setDoc(newRef, payload);
        success("Team member added");
      }
      
      onClose();
    } catch (err) {
      console.error(err);
      error("Failed to save team member");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
            {memberToEdit ? "Edit Team Member" : "Add Team Member"}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800">
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Name</label>
            <input 
              type="text"
              required
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Email</label>
            <input 
              type="email"
              required
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Role</label>
            <select
              className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Base Salary (RON)</label>
              <input 
                type="number"
                min="0"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.baseSalary}
                onChange={e => setFormData({...formData, baseSalary: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Monthly Bonus (RON)</label>
              <input 
                type="number"
                min="0"
                className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-800 border-transparent rounded-lg focus:ring-2 focus:ring-primary-500"
                value={formData.defaultBonus}
                onChange={e => setFormData({...formData, defaultBonus: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">Color</label>
            <div className="flex gap-3 flex-wrap">
              {COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setFormData({...formData, color: c})}
                  className={clsx(
                    "w-8 h-8 rounded-full transition-all flex items-center justify-center",
                    formData.color === c ? "ring-2 ring-offset-2 ring-primary-500 scale-110" : "hover:scale-105"
                  )}
                  style={{ backgroundColor: c }}
                >
                  {formData.color === c && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input 
              type="checkbox" 
              id="isActive"
              checked={formData.isActive}
              onChange={e => setFormData({...formData, isActive: e.target.checked})}
              className="rounded text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Active Account</label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Member"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}