/**
 * Evaluation generators for the 5 protocols.
 *
 * The rule that matters here: we generate RAW ITEM SCORES only, then hand them
 * to the application's own summary calculators (loaded via loadAppModule) to
 * derive every summary field. Hand-writing summary numbers is how seeded
 * evaluations end up claiming a percentage their item scores don't support —
 * looks fine in a list, renders wrong in a report or a comparison.
 *
 * Ability is a 0..1 dial. A hero client gets three evaluations at rising
 * ability, so comparison views show real improvement.
 */
import { loadAppModule } from "./loadAppModule.mjs";

/* ---------------- protocol modules ---------------- */

const abllsProtocol = await loadAppModule("src/data/ablls-r-protocol.ts");
const evaluationTypes = await loadAppModule("src/types/evaluation.ts");
const abllsAge = await loadAppModule("src/lib/abllsAgeReference.ts");
const vbmappHook = await loadAppModule("src/hooks/useVBMAPP.ts");
const vbmappTypes = await loadAppModule("src/types/vbmapp.ts");
const portageHook = await loadAppModule("src/hooks/usePortage.ts");
const portageTypes = await loadAppModule("src/types/portage.ts");
const portageData = (await import("../../evals/portage.json", { with: { type: "json" } })).default;
const carsHook = await loadAppModule("src/hooks/useCARS.ts");
const carsTypes = await loadAppModule("src/types/cars.ts");
const carolinaHook = await loadAppModule("src/hooks/useCarolina.ts");
const carolinaProtocol = await loadAppModule("src/data/carolina-protocol.ts");

/**
 * Probability that an item at position `idx` of `total` is mastered, for a child
 * at `ability`. Items within a protocol category run easy -> hard, so mastery
 * should taper off across the category rather than being uniform.
 */
function masteryChance(ability, idx, total) {
  const difficulty = total > 1 ? idx / (total - 1) : 0;
  return Math.max(0, Math.min(1, (ability - difficulty) * 2.2 + 0.28));
}

/* ---------------- ABLLS-R ---------------- */

export function generateAblls({ clientId, ability, ageMonths, rng, dateISO, evaluator }) {
  const scores = {};

  for (const category of abllsProtocol.ABLLS_PROTOCOL) {
    // Criterion-referenced, not age-normed: sections a child is simply not old
    // enough for are marked N/A rather than scored 0. computeCategorySummary
    // excludes N/A items from the denominator, so they don't read as deficits.
    const ageExpected = abllsAge.isAbllsSectionAgeExpected(category.id, ageMonths);
    for (let i = 0; i < category.items.length; i++) {
      const item = category.items[i];
      if (!ageExpected) {
        scores[item.id] = { score: 0, isNA: true, updatedAt: dateISO };
        continue;
      }
      const chance = masteryChance(ability, i, category.items.length);
      const roll = rng();
      let score;
      if (roll < chance * 0.75) score = item.maxScore;
      else if (roll < chance) score = Math.max(1, item.maxScore - 1);
      else if (roll < chance + 0.18) score = Math.min(1, item.maxScore);
      else score = 0;
      scores[item.id] = { score, updatedAt: dateISO };
    }
  }

  const summary = evaluationTypes.computeOverallSummary(abllsProtocol.ABLLS_PROTOCOL, scores);

  return {
    clientId,
    type: "ABLLS",
    version: "ABLLS-R-RO",
    createdAt: dateISO,
    updatedAt: dateISO,
    completedAt: dateISO,
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    status: "completed",
    scores,
    ...summary,
  };
}

/* ---------------- VB-MAPP ---------------- */

export function generateVbmapp({ clientId, ability, rng, dateISO, evaluator }) {
  const milestoneScores = {};
  const barrierScores = {};
  const transitionScores = {};

  for (const area of vbmappHook.VBMAPP_SKILL_AREAS) {
    // Higher levels are developmentally later, so mastery thins out as the level
    // rises — but not so steeply that a preschooler in therapy scores near zero.
    // Calibrated so a strong hero lands around Level 1 ~75% / L2 ~55% / L3 ~35%.
    const levelPenalty = ((area.level || 1) - 1) * 0.16;
    const areaAbility = Math.max(0, Math.min(1, ability * 1.35) - levelPenalty);
    for (let i = 0; i < area.items.length; i++) {
      const chance = masteryChance(areaAbility, i, area.items.length);
      const roll = rng();
      const score = roll < chance * 0.7 ? 1 : roll < chance ? 0.5 : 0;
      milestoneScores[area.items[i].id] = { score, updatedAt: dateISO };
    }
  }

  // Barriers are 0-4 severity: a more able child has fewer / milder barriers.
  for (const barrier of vbmappHook.VBMAPP_BARRIERS) {
    const severity = Math.max(0, Math.round((1 - ability) * 4 * (0.55 + rng() * 0.9)));
    barrierScores[barrier.id] = { score: Math.min(4, severity), updatedAt: dateISO };
  }

  // Transition readiness is 1-5, higher = more ready.
  for (const t of vbmappHook.VBMAPP_TRANSITION) {
    const readiness = Math.max(1, Math.min(5, Math.round(1 + ability * 4 * (0.7 + rng() * 0.6))));
    transitionScores[t.id] = { score: readiness, updatedAt: dateISO };
  }

  const summaries = vbmappTypes.computeVBMAPPSummaries(
    vbmappHook.VBMAPP_SKILL_AREAS,
    vbmappHook.VBMAPP_BARRIERS,
    vbmappHook.VBMAPP_TRANSITION,
    milestoneScores,
    barrierScores,
    transitionScores,
  );

  return {
    clientId,
    type: "VB-MAPP",
    version: "VB-MAPP-2nd-Edition",
    createdAt: dateISO,
    updatedAt: dateISO,
    completedAt: dateISO,
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    status: "completed",
    milestoneScores,
    barrierScores,
    transitionScores,
    supportingSkillScores: {},
    ...summaries,
  };
}

/* ---------------- Portage ---------------- */

export function generatePortage({ clientId, ability, ageMonths, rng, dateISO, evaluator }) {
  const scores = {};

  for (const category of portageTypes.PORTAGE_CATEGORIES) {
    const items = portageData[category] || [];
    for (const item of items) {
      // Portage items carry a `months` band — a child achieves items at or
      // below their developmental level, with a soft edge above it. Capped below
      // chronological age: a child in therapy for a developmental delay should
      // not present a developmental age ahead of their actual one.
      const devCeiling = Math.min(ageMonths * 0.92, ageMonths * (0.55 + ability * 0.5));
      const margin = (devCeiling - (item.months || 0)) / 12;
      const chance = Math.max(0, Math.min(0.97, 0.5 + margin * 0.55));
      scores[item.id] = { achieved: rng() < chance, updatedAt: dateISO };
    }
  }

  const { summaries, overallDevelopmentalAgeMonths } = portageHook.calculatePortageSummary(scores, ageMonths);

  return {
    clientId,
    status: "completed",
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    createdAt: dateISO,
    updatedAt: dateISO,
    completedAt: dateISO,
    scores,
    summaries,
    overallDevelopmentalAgeMonths,
    chronologicalAgeAtEvaluation: ageMonths,
  };
}

/* ---------------- CARS ---------------- */

export function generateCars({ clientId, ability, rng, dateISO, evaluator }) {
  const scores = {};
  // CARS is LOWER-is-better: severity falls as ability rises. Calibrated to move
  // from "severe" to "mild-moderate" rather than bottoming out at "none" — these
  // are children carrying an autism diagnosis, so a no-autism total would be a
  // clinically odd thing to show on a progress screenshot.
  for (const item of carsTypes.CARS_ITEMS) {
    // Saturates around a total of ~31 at peak ability: "severe" -> "mild-moderate",
    // never reaching the below-30 "no autism" band.
    const base = 1.9 + (1 - ability) * 1.5;
    const jitter = (rng() - 0.5) * 0.9;
    const raw = Math.max(1, Math.min(4, base + jitter));
    scores[String(item.id)] = { value: Math.round(raw * 2) / 2, updatedAt: dateISO };
  }

  const summary = carsHook.calculateCARSSummary(scores);

  return {
    clientId,
    status: "completed",
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    createdAt: dateISO,
    updatedAt: dateISO,
    completedAt: dateISO,
    scores,
    ...summary,
  };
}

/* ---------------- Carolina ---------------- */

export function generateCarolina({ clientId, ability, rng, dateISO, evaluator }) {
  const scores = {};
  for (const domain of carolinaProtocol.CAROLINA_PROTOCOL) {
    for (const seq of domain.sequences) {
      for (let i = 0; i < seq.items.length; i++) {
        const chance = masteryChance(ability, i, seq.items.length);
        const roll = rng();
        const value = roll < chance * 0.7 ? "M" : roll < chance + 0.2 ? "D" : "A";
        scores[seq.items[i].id] = { value, updatedAt: dateISO };
      }
    }
  }

  const summary = carolinaHook.calculateCarolinaSummary(scores);

  return {
    clientId,
    status: "completed",
    evaluatorId: evaluator.id,
    evaluatorName: evaluator.name,
    createdAt: dateISO,
    updatedAt: dateISO,
    completedAt: dateISO,
    scores,
    ...summary,
  };
}

export const GENERATORS = {
  evaluations: { generate: generateAblls, label: "ABLLS-R" },
  vbmapp_evaluations: { generate: generateVbmapp, label: "VB-MAPP" },
  portage_evaluations: { generate: generatePortage, label: "Portage" },
  cars_evaluations: { generate: generateCars, label: "CARS" },
  carolina_evaluations: { generate: generateCarolina, label: "Carolina" },
};
