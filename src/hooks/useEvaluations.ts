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
  getDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Evaluation,
  ItemScore,
  computeOverallSummary
} from "@/types/evaluation";
import { ABLLS_PROTOCOL } from "@/data/ablls-r-protocol";

// Use full ABLLS-R protocol
export const ABLLS_CATEGORIES = ABLLS_PROTOCOL;

// Get total item count from protocol
export const ABLLS_TOTAL_ITEMS = ABLLS_CATEGORIES.reduce(
  (sum, cat) => sum + cat.items.length,
  0
);

// Get total max score possible
export const ABLLS_MAX_TOTAL_SCORE = ABLLS_CATEGORIES.reduce(
  (sum, cat) => sum + cat.items.reduce((itemSum, item) => itemSum + item.maxScore, 0),
  0
);

// Hook to fetch all evaluations for a client
export function useClientEvaluations(clientId: string) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    const evaluationsRef = collection(db, "clients", clientId, "evaluations");
    const q = query(evaluationsRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        })) as Evaluation[];
        setEvaluations(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching evaluations:", err);
        setError("Failed to load evaluations");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId]);

  return { evaluations, loading, error };
}

// Hook to fetch a single evaluation
export function useEvaluation(clientId: string, evaluationId: string) {
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId || !evaluationId) {
      setEvaluation(null);
      setLoading(false);
      return;
    }

    const evaluationRef = doc(db, "clients", clientId, "evaluations", evaluationId);

    const unsubscribe = onSnapshot(
      evaluationRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setEvaluation({ id: snapshot.id, ...snapshot.data() } as Evaluation);
        } else {
          setEvaluation(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Error fetching evaluation:", err);
        setError("Failed to load evaluation");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [clientId, evaluationId]);

  return { evaluation, loading, error };
}

// Helper to sanitize scores (remove undefined values)
function sanitizeScores(scores: Record<string, ItemScore>): Record<string, ItemScore> {
  const sanitized: Record<string, ItemScore> = {};
  Object.entries(scores).forEach(([key, value]) => {
    const item: ItemScore = {
      score: value.score,
      updatedAt: value.updatedAt
    };
    // Only include note if it's defined (Firestore rejects undefined)
    if (value.note !== undefined) {
      item.note = value.note;
    }
    sanitized[key] = item;
  });
  return sanitized;
}

// Hook for evaluation CRUD operations
export function useEvaluationActions() {
  const [saving, setSaving] = useState(false);

  // Create a new evaluation
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
        const { categorySummaries, overallPercentage, overallScore, overallMaxScore } =
          computeOverallSummary(ABLLS_CATEGORIES, {});

        const newEvaluation: Omit<Evaluation, "id"> = {
          clientId,
          type: "ABLLS",
          version: "ABLLS-R-v1",
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          evaluatorId,
          evaluatorName,
          status: "in_progress",
          scores: {},
          categorySummaries,
          overallPercentage,
          overallScore,
          overallMaxScore,
          ...(previousEvaluationId && { previousEvaluationId })
        };

        const evaluationsRef = collection(db, "clients", clientId, "evaluations");
        const docRef = await addDoc(evaluationsRef, newEvaluation);

        return docRef.id;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Update a single item score
  const updateItemScore = useCallback(
    async (
      clientId: string,
      evaluationId: string,
      itemId: string,
      score: number,
      note?: string
    ) => {
      const evaluationRef = doc(db, "clients", clientId, "evaluations", evaluationId);

      const itemScore: ItemScore = {
        score,
        updatedAt: new Date().toISOString(),
        ...(note && { note })
      };

      await updateDoc(evaluationRef, {
        [`scores.${itemId}`]: itemScore,
        updatedAt: new Date().toISOString()
      });
    },
    []
  );

  // Batch update scores and recompute summaries
  const saveEvaluationProgress = useCallback(
    async (
      clientId: string,
      evaluationId: string,
      scores: Record<string, ItemScore>
    ) => {
      setSaving(true);
      try {
        const evaluationRef = doc(db, "clients", clientId, "evaluations", evaluationId);
        
        // Sanitize scores to ensure no undefined values
        const cleanScores = sanitizeScores(scores);

        // Recompute summaries
        const { categorySummaries, overallPercentage, overallScore, overallMaxScore } =
          computeOverallSummary(ABLLS_CATEGORIES, cleanScores);

        await updateDoc(evaluationRef, {
          scores: cleanScores,
          categorySummaries,
          overallPercentage,
          overallScore,
          overallMaxScore,
          updatedAt: new Date().toISOString()
        });
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Complete an evaluation
  const completeEvaluation = useCallback(
    async (
      clientId: string,
      evaluationId: string,
      scores: Record<string, ItemScore>
    ) => {
      setSaving(true);
      try {
        const evaluationRef = doc(db, "clients", clientId, "evaluations", evaluationId);

        // Sanitize scores to ensure no undefined values
        const cleanScores = sanitizeScores(scores);

        // Recompute summaries
        const { categorySummaries, overallPercentage, overallScore, overallMaxScore } =
          computeOverallSummary(ABLLS_CATEGORIES, cleanScores);

        await updateDoc(evaluationRef, {
          scores: cleanScores,
          categorySummaries,
          overallPercentage,
          overallScore,
          overallMaxScore,
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

  // Delete an evaluation
  const deleteEvaluation = useCallback(
    async (clientId: string, evaluationId: string) => {
      setSaving(true);
      try {
        const evaluationRef = doc(db, "clients", clientId, "evaluations", evaluationId);
        await deleteDoc(evaluationRef);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  // Get previous evaluation for re-evaluation
  const getPreviousEvaluation = useCallback(
    async (clientId: string, evaluationId: string): Promise<Evaluation | null> => {
      const evaluationRef = doc(db, "clients", clientId, "evaluations", evaluationId);
      const snapshot = await getDoc(evaluationRef);

      if (snapshot.exists()) {
        return { id: snapshot.id, ...snapshot.data() } as Evaluation;
      }
      return null;
    },
    []
  );

  return {
    saving,
    createEvaluation,
    updateItemScore,
    saveEvaluationProgress,
    completeEvaluation,
    deleteEvaluation,
    getPreviousEvaluation
  };
}
