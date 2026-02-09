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
  getDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  CARSEvaluation, 
  CARSScore, 
  CARS_ITEMS,
  CARSSeverity
} from "@/types/cars";

// Helper to calculate summary
export function calculateCARSSummary(scores: Record<string, CARSScore>) {
  let totalScore = 0;
  const scoredItems = Object.values(scores);
  
  scoredItems.forEach(s => {
    totalScore += s.value;
  });

  let severity: CARSSeverity = 'none';
  if (totalScore >= 37) severity = 'severe';
  else if (totalScore >= 30) severity = 'mild-moderate';

  return {
    totalScore,
    severity
  };
}

// Helper to sanitize scores
function sanitizeScores(scores: Record<string, CARSScore>): Record<string, CARSScore> {
  const sanitized: Record<string, CARSScore> = {};
  Object.entries(scores).forEach(([key, value]) => {
    sanitized[key] = {
      value: value.value,
      updatedAt: value.updatedAt,
      ...(value.note !== undefined && value.note !== "" && { note: value.note })
    };
  });
  return sanitized;
}

export function useCARSEvaluations(clientId: string) {
  const [evaluations, setEvaluations] = useState<CARSEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", clientId, "cars_evaluations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CARSEvaluation[];
      setEvaluations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientId]);

  return { evaluations, loading };
}

export function useCARSEvaluation(clientId: string, evaluationId: string) {
  const [evaluation, setEvaluation] = useState<CARSEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || !evaluationId) {
      setEvaluation(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "clients", clientId, "cars_evaluations", evaluationId),
      (snapshot) => {
        if (snapshot.exists()) {
          setEvaluation({ id: snapshot.id, ...snapshot.data() } as CARSEvaluation);
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

export function useCARSActions() {
  const [saving, setSaving] = useState(false);

  const createEvaluation = useCallback(async (
    clientId: string,
    evaluatorId: string,
    evaluatorName: string
  ) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newEval: Omit<CARSEvaluation, 'id'> = {
        clientId,
        status: 'in_progress',
        evaluatorId,
        evaluatorName,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        scores: {},
        totalScore: 0,
        severity: 'none'
      };

      const docRef = await addDoc(collection(db, "clients", clientId, "cars_evaluations"), newEval);
      return docRef.id;
    } finally {
      setSaving(false);
    }
  }, []);

  const saveProgress = useCallback(async (
    clientId: string,
    evaluationId: string,
    scores: Record<string, CARSScore>
  ) => {
    setSaving(true);
    try {
      const cleanScores = sanitizeScores(scores);
      const { totalScore, severity } = calculateCARSSummary(cleanScores);
      
      await updateDoc(doc(db, "clients", clientId, "cars_evaluations", evaluationId), {
        scores: cleanScores,
        totalScore,
        severity,
        updatedAt: new Date().toISOString()
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const completeEvaluation = useCallback(async (
    clientId: string,
    evaluationId: string,
    scores: Record<string, CARSScore>
  ) => {
    setSaving(true);
    try {
      const cleanScores = sanitizeScores(scores);
      const { totalScore, severity } = calculateCARSSummary(cleanScores);
      const now = new Date().toISOString();

      await updateDoc(doc(db, "clients", clientId, "cars_evaluations", evaluationId), {
        scores: cleanScores,
        totalScore,
        severity,
        status: 'completed',
        completedAt: now,
        updatedAt: now
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteEvaluation = useCallback(async (clientId: string, evaluationId: string) => {
    await deleteDoc(doc(db, "clients", clientId, "cars_evaluations", evaluationId));
  }, []);

  return {
    saving,
    createEvaluation,
    saveProgress,
    completeEvaluation,
    deleteEvaluation
  };
}
