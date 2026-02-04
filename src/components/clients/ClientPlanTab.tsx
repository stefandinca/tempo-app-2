"use client";

import { useState, useEffect } from "react";
import {
  ClipboardList,
  Plus,
  Calendar,
  BookOpen,
  Edit,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Target
} from "lucide-react";
import { clsx } from "clsx";
import { useInterventionPlans, InterventionPlan, usePrograms } from "@/hooks/useCollections";
import CreatePlanModal from "./CreatePlanModal";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";

interface ClientPlanTabProps {
  client: any;
  pendingAction?: string | null;
  onActionHandled?: () => void;
}

export default function ClientPlanTab({ client, pendingAction, onActionHandled }: ClientPlanTabProps) {
  const { data: plans, loading, activePlan } = useInterventionPlans(client.id);
  const { data: programs } = usePrograms();
  const { success, error } = useToast();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<InterventionPlan | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Handle pending action from URL
  useEffect(() => {
    if (pendingAction === "create-plan" && !loading) {
      setIsCreateModalOpen(true);
      onActionHandled?.();
    }
  }, [pendingAction, loading, onActionHandled]);

  const completedPlans = plans.filter(p => p.status === "completed");
  const draftPlans = plans.filter(p => p.status === "draft");

  const getProgramNames = (programIds: string[]) => {
    return programIds
      .map(id => programs.find(p => p.id === id)?.title || id)
      .filter(Boolean);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };

  const calculateDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleEndPlan = async (plan: InterventionPlan) => {
    if (!confirm(`End "${plan.name}"? This will mark the plan as completed.`)) return;

    try {
      const planRef = doc(db, "clients", client.id, "interventionPlans", plan.id);
      await updateDoc(planRef, { status: "completed" });
      success("Plan marked as completed");
    } catch (err) {
      console.error(err);
      error("Failed to update plan");
    }
  };

  const handleActivatePlan = async (plan: InterventionPlan) => {
    // Check if there's already an active plan
    if (activePlan && activePlan.id !== plan.id) {
      if (!confirm(`There's already an active plan. Activating this will end "${activePlan.name}". Continue?`)) {
        return;
      }
      // End the current active plan
      const currentPlanRef = doc(db, "clients", client.id, "interventionPlans", activePlan.id);
      await updateDoc(currentPlanRef, { status: "completed" });
    }

    try {
      const planRef = doc(db, "clients", client.id, "interventionPlans", plan.id);
      await updateDoc(planRef, { status: "active" });
      success("Plan activated");
    } catch (err) {
      console.error(err);
      error("Failed to activate plan");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Active Plan Section */}
      {activePlan ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <div className="p-6">
            {/* Plan Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                      {activePlan.name}
                    </h3>
                    <span className="px-2 py-0.5 bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400 text-xs font-bold rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-pulse" />
                      Active
                    </span>
                  </div>
                  <p className="text-sm text-neutral-500 mt-0.5">
                    Intervention Plan
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditingPlan(activePlan)}
                  className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <Edit className="w-4 h-4 text-neutral-500" />
                </button>
              </div>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-6 mb-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-400" />
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {formatDate(activePlan.startDate)} → {formatDate(activePlan.endDate)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-neutral-400" />
                <span className={clsx(
                  "text-sm font-medium",
                  calculateDaysRemaining(activePlan.endDate) <= 7
                    ? "text-warning-600"
                    : "text-neutral-600 dark:text-neutral-400"
                )}>
                  {calculateDaysRemaining(activePlan.endDate) > 0
                    ? `${calculateDaysRemaining(activePlan.endDate)} days remaining`
                    : "Plan ended"
                  }
                </span>
              </div>
            </div>

            {/* Programs */}
            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                Programs ({activePlan.programIds.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {getProgramNames(activePlan.programIds).map((name, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-sm font-medium rounded-lg"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    {name}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800">
              <button
                onClick={() => setEditingPlan(activePlan)}
                className="flex-1 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 font-medium transition-colors text-sm"
              >
                Edit Plan
              </button>
              <button
                onClick={() => handleEndPlan(activePlan)}
                className="flex-1 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-xl font-medium transition-colors text-sm hover:bg-neutral-800 dark:hover:bg-neutral-100"
              >
                End Plan
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-12 text-center">
          <div className="w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
            No Active Intervention Plan
          </h3>
          <p className="text-neutral-500 max-w-sm mx-auto mb-6">
            Create a plan to automatically assign programs to this client&apos;s therapy sessions.
          </p>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-colors shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-4 h-4" />
            Create Intervention Plan
          </button>
        </div>
      )}

      {/* Draft Plans */}
      {draftPlans.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-neutral-500 uppercase tracking-wider">
            Draft Plans ({draftPlans.length})
          </h4>
          {draftPlans.map(plan => (
            <div
              key={plan.id}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
                    <ClipboardList className="w-5 h-5 text-neutral-400" />
                  </div>
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{plan.name}</p>
                    <p className="text-xs text-neutral-500">
                      {formatDate(plan.startDate)} → {formatDate(plan.endDate)} · {plan.programIds.length} programs
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingPlan(plan)}
                    className="px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleActivatePlan(plan)}
                    className="px-3 py-1.5 text-xs font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Activate
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add New Plan Button (when there's an active plan) */}
      {activePlan && (
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full py-3 border-2 border-dashed border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-500 hover:border-primary-300 hover:text-primary-600 transition-colors font-medium flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create New Plan
        </button>
      )}

      {/* Plan History */}
      {completedPlans.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-sm font-semibold text-neutral-500 uppercase tracking-wider hover:text-neutral-700 transition-colors"
          >
            <span>Plan History ({completedPlans.length})</span>
            {showHistory ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>

          {showHistory && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              {completedPlans.map(plan => (
                <div
                  key={plan.id}
                  className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 border border-neutral-100 dark:border-neutral-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-neutral-400" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-700 dark:text-neutral-300">{plan.name}</p>
                        <p className="text-xs text-neutral-500">
                          {formatDate(plan.startDate)} → {formatDate(plan.endDate)} · {plan.programIds.length} programs
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-neutral-400 font-medium">Completed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <CreatePlanModal
        isOpen={isCreateModalOpen || !!editingPlan}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingPlan(null);
        }}
        clientId={client.id}
        existingPlan={editingPlan}
      />
    </div>
  );
}
