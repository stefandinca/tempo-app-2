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
  CarolinaEvaluation, 
  CarolinaScore, 
  CAROLINA_DOMAINS_LIST 
} from "@/types/carolina";
import { CAROLINA_PROTOCOL } from "@/data/carolina-protocol";

// Helper to calculate summary
export function calculateCarolinaSummary(scores: Record<string, CarolinaScore>) {
  let totalMastered = 0;
  let totalEmerging = 0;
  
  const domainProgress: Record<string, { total: number; mastered: number; emerging: number }> = {};

  // Initialize domains
  CAROLINA_DOMAINS_LIST.forEach(d => {
    domainProgress[d] = { total: 0, mastered: 0, emerging: 0 };
  });

  // Calculate totals based on protocol structure
  CAROLINA_PROTOCOL.forEach(domain => {
    let domainMastered = 0;
    let domainEmerging = 0;
    let domainTotal = 0;

    domain.sequences.forEach(seq => {
      domainTotal += seq.items.length;
      seq.items.forEach(item => {
        const score = scores[item.id];
        if (score?.value === 'M') {
          domainMastered++;
          totalMastered++;
        } else if (score?.value === 'D') {
          domainEmerging++;
          totalEmerging++;
        }
      });
    });

    if (domainProgress[domain.id]) {
       // Note: domain.id in protocol matches the keys used in CAROLINA_DOMAINS_LIST? 
       // Actually CAROLINA_DOMAINS_LIST has display names "Cognitiv", protocol has IDs "cognitiv".
       // Let's use the protocol IDs for the map keys to be safe.
    }
    
    // We'll use the protocol ID as the key for consistency
    domainProgress[domain.id] = {
      total: domainTotal,
      mastered: domainMastered,
      emerging: domainEmerging
    };
  });

  return {
    totalMastered,
    totalEmerging,
    domainProgress
  };
}

export function useCarolinaEvaluations(clientId: string) {
  const [evaluations, setEvaluations] = useState<CarolinaEvaluation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) {
      setEvaluations([]);
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, "clients", clientId, "carolina_evaluations"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CarolinaEvaluation[];
      setEvaluations(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [clientId]);

  return { evaluations, loading };
}

export function useCarolinaEvaluation(clientId: string, evaluationId: string) {
  const [evaluation, setEvaluation] = useState<CarolinaEvaluation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId || !evaluationId) {
      setEvaluation(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, "clients", clientId, "carolina_evaluations", evaluationId),
      (snapshot) => {
        if (snapshot.exists()) {
          setEvaluation({ id: snapshot.id, ...snapshot.data() } as CarolinaEvaluation);
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

export function useCarolinaActions() {
  const [saving, setSaving] = useState(false);

  const createEvaluation = useCallback(async (
    clientId: string,
    evaluatorId: string,
    evaluatorName: string
  ) => {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const newEval: Omit<CarolinaEvaluation, 'id'> = {
        clientId,
        status: 'in_progress',
        evaluatorId,
        evaluatorName,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        scores: {},
        totalMastered: 0,
        totalEmerging: 0,
        domainProgress: {}
      };

      const docRef = await addDoc(collection(db, "clients", clientId, "carolina_evaluations"), newEval);
      return docRef.id;
    } finally {
      setSaving(false);
    }
  }, []);

  const saveProgress = useCallback(async (
    clientId: string,
    evaluationId: string,
    scores: Record<string, CarolinaScore>
  ) => {
    setSaving(true);
    try {
      const { totalMastered, totalEmerging, domainProgress } = calculateCarolinaSummary(scores);
      
      await updateDoc(doc(db, "clients", clientId, "carolina_evaluations", evaluationId), {
        scores,
        totalMastered,
        totalEmerging,
        domainProgress,
        updatedAt: new Date().toISOString()
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const completeEvaluation = useCallback(async (
    clientId: string,
    evaluationId: string,
    scores: Record<string, CarolinaScore>
  ) => {
    setSaving(true);
    try {
      const { totalMastered, totalEmerging, domainProgress } = calculateCarolinaSummary(scores);
      const now = new Date().toISOString();

      await updateDoc(doc(db, "clients", clientId, "carolina_evaluations", evaluationId), {
        scores,
        totalMastered,
        totalEmerging,
        domainProgress,
        status: 'completed',
        completedAt: now,
        updatedAt: now
      });
    } finally {
      setSaving(false);
    }
  }, []);

  const deleteEvaluation = useCallback(async (clientId: string, evaluationId: string) => {
    await deleteDoc(doc(db, "clients", clientId, "carolina_evaluations", evaluationId));
  }, []);

  return {
    saving,
    createEvaluation,
    saveProgress,
    completeEvaluation,
    deleteEvaluation
  };
}
