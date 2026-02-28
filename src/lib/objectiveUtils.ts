import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Objective } from "@/hooks/useCollections";

/**
 * Cycle an objective's status: not_started → in_progress → achieved → not_started
 */
export function getNextObjectiveStatus(
  current: Objective["status"]
): Objective["status"] {
  const cycle: Objective["status"][] = ["not_started", "in_progress", "achieved"];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}

/**
 * Update a single objective's status on the intervention plan document.
 * Reads the current objectives array, patches the target, and writes back.
 */
export async function updateObjectiveStatus(
  clientId: string,
  planId: string,
  objectives: Objective[],
  objectiveId: string,
  newStatus: Objective["status"]
): Promise<void> {
  const updated = objectives.map((obj) =>
    obj.id === objectiveId ? { ...obj, status: newStatus } : obj
  );
  const planRef = doc(db, "clients", clientId, "interventionPlans", planId);
  await updateDoc(planRef, { objectives: updated });
}
