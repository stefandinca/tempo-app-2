"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  where
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  VBMAPPEvaluation,
  VBMAPPItemScore,
  ParsedSkillArea,
  VBMAPPBarrierItem,
  VBMAPPTransitionItem,
  parseVBMAPPData,
  computeVBMAPPSummaries
} from "@/types/vbmapp";
import vbmappData from "../../evals/vbmapp.json";

// Parse VB-MAPP data once
const parsedData = parseVBMAPPData(vbmappData as any);

export const VBMAPP_SKILL_AREAS = parsedData.skillAreas;
export const VBMAPP_BARRIERS = parsedData.barriers;
export const VBMAPP_TRANSITION = parsedData.transition;
export const VBMAPP_TASK_ANALYSIS = parsedData.taskAnalysis;
export const VBMAPP_IEP_OBJECTIVES = parsedData.iepObjectives;

// Get skill areas by level
export const VBMAPP_LEVEL_1_AREAS = VBMAPP_SKILL_AREAS.filter((a) => a.level === 1);
export const VBMAPP_LEVEL_2_AREAS = VBMAPP_SKILL_AREAS.filter((a) => a.level === 2);
export const VBMAPP_LEVEL_3_AREAS = VBMAPP_SKILL_AREAS.filter((a) => a.level === 3);

// Total items count
export const VBMAPP_TOTAL_MILESTONE_ITEMS = VBMAPP_SKILL_AREAS.reduce(
  (sum, area) => sum + area.items.length,
  0
);

// Hook to fetch all VB-MAPP evaluations for a client
export function useClientVBMAPPEvaluations(clientId: string) {
  const [evaluations, setEvaluations] = useState<VBMAPPEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    const evaluationsRef = collection(db, "clients", clientId, "vbmapp_evaluations");
    const q = query(evaluationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as VBMAPPEvaluation[];
        setEvaluations(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching VB-MAPP evaluations:", err);
        setError("Failed to load VB-MAPP evaluations");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  return { evaluations, loading, error };
}

// Hook to fetch a single VB-MAPP evaluation
export function useVBMAPPEvaluation(clientId: string, evaluationId: string) {
  const [evaluation, setEvaluation] = useState<VBMAPPEvaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !evaluationId) {
      setEvaluation(null);
      setLoading(false);
      return;
    }

    const evaluationRef = doc(db, "clients", clientId, "vbmapp_evaluations", evaluationId);

    const unsubscribe = onSnapshot(
      evaluationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setEvaluation({ id: snapshot.id, ...snapshot.data() } as VBMAPPEvaluation);
        } else {
          setEvaluation(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching VB-MAPP evaluation:", err);
        setError("Failed to load VB-MAPP evaluation");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, evaluationId]);

  return { evaluation, loading, error };
}

// Hook for VB-MAPP evaluation CRUD operations
export function useVBMAPPActions() {
  const [saving, setSaving] = useState(false);

  // Create a new VB-MAPP evaluation
  const createEvaluation = useCallback(
    async (
      clientId: string,
      evaluatorId: string,
      evaluatorName: string,
      previousEvaluationId?: string
    ): Promise<string> => {
      setSaving(true);
      try {
        const now = new Date().toISOString();

        // Initialize empty summaries
        const {
          levelSummaries,
          barrierSummary,
          transitionSummary,
          overallMilestoneScore,
          overallMilestoneMaxScore,
          overallMilestonePercentage,
          dominantLevel
        } = computeVBMAPPSummaries(
          VBMAPP_SKILL_AREAS,
          VBMAPP_BARRIERS,
          VBMAPP_TRANSITION,
          {},
          {},
          {}
        );

        const newEvaluation: Omit<VBMAPPEvaluation, "id"> = {
          clientId,
          type: "VB-MAPP",
          version: "VB-MAPP-2nd-Edition",
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          evaluatorId,
          evaluatorName,
          status: "in_progress",
          milestoneScores: {},
          barrierScores: {},
          transitionScores: {},
          levelSummaries,
          barrierSummary,
          transitionSummary,
          overallMilestoneScore,
          overallMilestoneMaxScore,
          overallMilestonePercentage,
          dominantLevel,
          ...(previousEvaluationId && { previousEvaluationId })
        };

        const evaluationsRef = collection(db, "clients", clientId, "vbmapp_evaluations");
        const docRef = await addDoc(evaluationsRef, newEvaluation);

        return docRef.id;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Save evaluation progress
  const saveProgress = useCallback(
    async (
      clientId: string,
      evaluationId: string,
      milestoneScores: Record<string, VBMAPPItemScore>,
      barrierScores: Record<string, VBMAPPItemScore>,
      transitionScores: Record<string, VBMAPPItemScore>
    ) => {
      setSaving(true);
      try {
        const evaluationRef = doc(db, "clients", clientId, "vbmapp_evaluations", evaluationId);

        // Recompute summaries
        const {
          levelSummaries,
          barrierSummary,
          transitionSummary,
          overallMilestoneScore,
          overallMilestoneMaxScore,
          overallMilestonePercentage,
          dominantLevel
        } = computeVBMAPPSummaries(
          VBMAPP_SKILL_AREAS,
          VBMAPP_BARRIERS,
          VBMAPP_TRANSITION,
          milestoneScores,
          barrierScores,
          transitionScores
        );

        await updateDoc(evaluationRef, {
          milestoneScores,
          barrierScores,
          transitionScores,
          levelSummaries,
          barrierSummary,
          transitionSummary,
          overallMilestoneScore,
          overallMilestoneMaxScore,
          overallMilestonePercentage,
          dominantLevel,
          updatedAt: new Date().toISOString()
        });
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Complete evaluation
  const completeEvaluation = useCallback(
    async (
      clientId: string,
      evaluationId: string,
      milestoneScores: Record<string, VBMAPPItemScore>,
      barrierScores: Record<string, VBMAPPItemScore>,
      transitionScores: Record<string, VBMAPPItemScore>
    ) => {
      setSaving(true);
      try {
        const evaluationRef = doc(db, "clients", clientId, "vbmapp_evaluations", evaluationId);

        // Recompute summaries
        const {
          levelSummaries,
          barrierSummary,
          transitionSummary,
          overallMilestoneScore,
          overallMilestoneMaxScore,
          overallMilestonePercentage,
          dominantLevel
        } = computeVBMAPPSummaries(
          VBMAPP_SKILL_AREAS,
          VBMAPP_BARRIERS,
          VBMAPP_TRANSITION,
          milestoneScores,
          barrierScores,
          transitionScores
        );

        await updateDoc(evaluationRef, {
          milestoneScores,
          barrierScores,
          transitionScores,
          levelSummaries,
          barrierSummary,
          transitionSummary,
          overallMilestoneScore,
          overallMilestoneMaxScore,
          overallMilestonePercentage,
          dominantLevel,
          status: "completed",
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Delete evaluation
  const deleteEvaluation = useCallback(
    async (clientId: string, evaluationId: string) => {
      setSaving(true);
      try {
        const evaluationRef = doc(db, "clients", clientId, "vbmapp_evaluations", evaluationId);
        await deleteDoc(evaluationRef);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  return {
    saving,
    createEvaluation,
    saveProgress,
    completeEvaluation,
    deleteEvaluation
  };
}
