"use client";

import { useState, useCallback, useEffect } from "react";
import {
  collection,
  doc,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  PortageEvaluation, 
  PortageScore, 
  PortageCategory, 
  PORTAGE_CATEGORIES,
  PortageCategorySummary
} from "@/types/portage";
import portageDataRaw from "../../evals/portage.json";

const portageData = portageDataRaw as Record<string, any[]>;

// Helper to calculate summary
export function calculatePortageSummary(
  scores: Record<string, PortageScore>,
  chronologicalAgeMonths: number
) {
  const summaries: Record<string, PortageCategorySummary> = {};
  let totalDevAge = 0;

  PORTAGE_CATEGORIES.forEach(cat => {
    const items = portageData[cat] || [];
    const achievedItems = items.filter(item => scores[item.id]?.achieved).length;
    
    // Calculate Developmental Age for this category
    // Logic: Find the highest month bracket where at least 50% of items are achieved
    // and use that as base, or use a linear interpolation.
    // For v1, let's use a simple linear progression:
    // (Achieved Items / Total Items) * Max Months (72)
    const maxMonths = 72;
    const devAge = items.length > 0 ? (achievedItems / items.length) * maxMonths : 0;

    summaries[cat] = {
      category: cat,
      totalItems: items.length,
      achievedItems,
      developmentalAgeMonths: Math.round(devAge * 10) / 10,
      percentage: items.length > 0 ? Math.round((achievedItems / items.length) * 100) : 0
    };

    totalDevAge += devAge;
  });

  const overallDevAge = totalDevAge / PORTAGE_CATEGORIES.length;

  return {
    summaries,
    overallDevelopmentalAgeMonths: Math.round(overallDevAge * 10) / 10
  };
}

// Helper to sanitize scores (remove undefined values)
function sanitizeScores(scores: Record<string, PortageScore>): Record<string, PortageScore> {
  const sanitized: Record<string, PortageScore> = {};
  Object.entries(scores).forEach(([key, value]) => {
    sanitized[key] = {
      achieved: value.achieved,
      updatedAt: value.updatedAt,
      ...(value.note !== undefined && value.note !== "" && { note: value.note })
    };
  });
  return sanitized;
}

export function usePortageEvaluations(clientId: string) {
  const [evaluations, setEvaluations] = useState<PortageEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", clientId, "portage_evaluations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PortageEvaluation[];
      setEvaluations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientId]);

  return { evaluations, loading };
}

export function usePortageEvaluation(clientId: string, evaluationId: string) {
  const [evaluation, setEvaluation] = useState<PortageEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || !evaluationId) {
      setEvaluation(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "clients", clientId, "portage_evaluations", evaluationId),
      (snapshot) => {
        if (snapshot.exists()) {
          setEvaluation({ id: snapshot.id, ...snapshot.data() } as PortageEvaluation);
        } else {
          setEvaluation(null);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, evaluationId]);

  return { evaluation, loading };
}

export function usePortageActions() {
  const [saving, setSaving] = useState(false);

  const createEvaluation = useCallback(async (
    clientId: string,
    evaluatorId: string,
    evaluatorName: string,
    chronologicalAgeMonths: number,
    previousEvaluationId?: string
  ) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const { summaries, overallDevelopmentalAgeMonths } = calculatePortageSummary({}, chronologicalAgeMonths);

      const newEval: Omit<PortageEvaluation, 'id'> = {
        clientId,
        status: 'in_progress',
        evaluatorId,
        evaluatorName,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        scores: {},
        summaries,
        overallDevelopmentalAgeMonths,
        chronologicalAgeAtEvaluation: chronologicalAgeMonths,
        ...(previousEvaluationId && { previousEvaluationId })
      };

      const docRef = await addDoc(collection(db, "clients", clientId, "portage_evaluations"), newEval);
      return docRef.id;
    } finally {
      setSaving(false);
    }
  }, []);

  const saveProgress = useCallback(async (
    clientId: string,
    evaluationId: string,
    scores: Record<string, PortageScore>,
    chronologicalAgeMonths: number
  ) => {
    setSaving(true);
    try {
      const cleanScores = sanitizeScores(scores);
      const { summaries, overallDevelopmentalAgeMonths } = calculatePortageSummary(cleanScores, chronologicalAgeMonths);
      
      await updateDoc(doc(db, "clients", clientId, "portage_evaluations", evaluationId), {
        scores: cleanScores,
        summaries,
        overallDevelopmentalAgeMonths,
        updatedAt: new Date().toISOString()
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const completeEvaluation = useCallback(async (
    clientId: string,
    evaluationId: string,
    scores: Record<string, PortageScore>,
    chronologicalAgeMonths: number
  ) => {
    setSaving(true);
    try {
      const cleanScores = sanitizeScores(scores);
      const { summaries, overallDevelopmentalAgeMonths } = calculatePortageSummary(cleanScores, chronologicalAgeMonths);
      const now = new Date().toISOString();

      await updateDoc(doc(db, "clients", clientId, "portage_evaluations", evaluationId), {
        scores: cleanScores,
        summaries,
        overallDevelopmentalAgeMonths,
        status: 'completed',
        completedAt: now,
        updatedAt: now
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteEvaluation = useCallback(async (clientId: string, evaluationId: string) => {
    await deleteDoc(doc(db, "clients", clientId, "portage_evaluations", evaluationId));
  }, []);

  return {
    saving,
    createEvaluation,
    saveProgress,
    completeEvaluation,
    deleteEvaluation
  };
}
