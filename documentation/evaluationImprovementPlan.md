# Evaluation System Improvement Plan

**Based on:** Corina's Clinical Feedback (`evaluationFeedback.md`)
**Date:** February 4, 2026

---

## Current Implementation Status

### Already Completed

| Feature | Status | Location |
|---------|--------|----------|
| Client birthDate field | Done | `src/types/client.ts` |
| Age calculation utilities | Done | `src/lib/ageUtils.ts` |
| VB-MAPP developmental age display | Done | `VBMAPPSummary.tsx` (lines 162-193) |
| Developmental delay calculation | Done | `ageUtils.ts` - `calculateDevelopmentalDelay()` |
| Severity classification | Done | mild/moderate/severe/profound labels |
| PDF signature lines | Done | `pdfGenerator.ts` |
| Client demographics in PDF | Done | birthDate, diagnosis, diagnosisLevel |
| clientData passed to Summary components | Done | Both ABLLS & VB-MAPP |

---

## Phase 1: Clinical Interpretation & IEP Goals (Priority: High)

### 1.1 Add Clinical Interpretation Text to Summaries

**Goal:** Provide context for scores so therapists and parents understand what they mean.

**ABLLS Interpretation Logic:**
```
Score >= 80%: "Skills are well-developed. Focus on generalization and maintenance."
Score 60-79%: "Good progress. Continue current intervention with focus on gaps."
Score 40-59%: "Moderate skill deficits. Targeted intervention recommended."
Score 20-39%: "Significant delays. Intensive intervention required (20-30 hrs/week)."
Score < 20%:  "Profound delays. Comprehensive ABA program recommended (30+ hrs/week)."
```

**VB-MAPP Interpretation (based on delay):**
```
No delay: "Development is age-appropriate."
Mild (< 25%): "Mild developmental delay. Regular therapy recommended."
Moderate (25-49%): "Moderate delay. Intensive early intervention recommended."
Severe (50-74%): "Severe delay. Comprehensive ABA program required."
Profound (>= 75%): "Profound delay. Maximum intervention intensity recommended."
```

**Files to modify:**
- `src/components/evaluations/EvaluationSummary.tsx`
- `src/components/evaluations/vbmapp/VBMAPPSummary.tsx`
- `src/lib/pdfGenerator.ts`

### 1.2 IEP Goal Generation from Emerging Skills

**Goal:** Auto-generate IEP objectives from items scored 0.5 (VB-MAPP) or 1 (ABLLS emerging).

**Implementation:**
1. Create utility function to extract emerging skills
2. Map emerging skills to goal templates
3. Add "Suggested Goals" section to Summary modals
4. Include in PDF export

**Files to create/modify:**
- `src/lib/goalGenerator.ts` (NEW)
- `src/components/evaluations/SuggestedGoals.tsx` (NEW)
- Both Summary components
- `src/lib/pdfGenerator.ts`

---

## Phase 2: PDF Report Enhancements (Priority: High)

### 2.1 Add Clinical Interpretation Section to PDFs

Add after score display:
- Interpretation text based on score/delay
- Recommended intervention intensity
- Priority areas for treatment

### 2.2 Add Age Analysis to VB-MAPP PDF

Currently missing from PDF. Add:
- Chronological age
- Developmental age equivalent
- Delay calculation
- Severity classification

### 2.3 Add Milestone Grid Visual to VB-MAPP PDF

Render the milestone grid in PDF format (simplified version).

### 2.4 Add Suggested IEP Goals Section

Include auto-generated goals in PDF.

---

## Phase 3: ABLLS Age Integration (Priority: Medium)

### 3.1 Add Age Display to ABLLS Summary

Similar to VB-MAPP, show:
- Client age
- Score interpretation based on age/severity

### 3.2 Add Skill Domain Groupings

Group categories into clinical domains:
- **Language & Communication:** D, E, F, G, H
- **Academic Readiness:** M, N, O, P, Q, R
- **Foundational Skills:** A, B, C, I, J
- **Social & Play:** K, L

Display domain-level summaries in addition to category scores.

---

## Phase 4: Future Enhancements (Priority: Lower)

### 4.1 Ceiling Rule for VB-MAPP
- Auto-suggest stopping when 3 consecutive 0s in skill area
- Show "ceiling reached" indicator

### 4.2 Skip/N/A Option
- Add "Not Applicable" scoring option
- Exclude N/A items from percentage calculations

### 4.3 Barrier-Intervention Mapping
- Link barriers to evidence-based interventions
- Display recommendations for severe barriers

### 4.4 Parent-Friendly Report
- Generate simplified report with non-clinical language
- Exclude technical terminology

---

## Implementation Order

### Sprint 1 (Current) - COMPLETED
1. [x] ~~Age utilities~~ (DONE - `src/lib/ageUtils.ts`)
2. [x] ~~VB-MAPP age display in Summary~~ (DONE - `VBMAPPSummary.tsx`)
3. [x] ~~Clinical interpretation text (ABLLS & VB-MAPP)~~ (DONE - `src/lib/clinicalInterpretation.ts`)
4. [x] ~~Age analysis in VB-MAPP PDF~~ (DONE - `src/lib/pdfGenerator.ts`)
5. [x] ~~Clinical interpretation in PDF~~ (DONE - both ABLLS and VB-MAPP)
6. [x] ~~ABLLS age display in Summary~~ (DONE - `EvaluationSummary.tsx`)
7. [x] ~~Priority intervention areas~~ (DONE - `EvaluationSummary.tsx`)
8. [x] ~~IEP goal generator utility~~ (DONE - `src/lib/goalGenerator.ts`)

### Sprint 2 - COMPLETED
9. [x] ~~Suggested Goals component (full UI with copy/export)~~ (DONE - `SuggestedGoals.tsx`)
10. [x] ~~Goals section in Summary modals~~ (DONE - Both ABLLS & VB-MAPP)
11. [x] ~~Goals table in PDF export~~ (DONE - `pdfGenerator.ts`)

### Sprint 3
10. [ ] ABLLS age display & interpretation
11. [ ] Skill domain groupings for ABLLS
12. [ ] Domain summaries in PDF

### Sprint 4+
13. [ ] Ceiling rule
14. [ ] Skip/N/A option
15. [ ] Barrier-intervention mapping
16. [ ] Parent-friendly report

---

## Technical Notes

### Goal Generation Algorithm

For VB-MAPP emerging skills (scored 0.5):
```typescript
interface SuggestedGoal {
  skillArea: string;
  itemId: string;
  itemDescription: string;
  goalTemplate: string;
  targetDate?: string;
}

// Template: "[Client] will [skill description] with [X]% accuracy
// across [Y] opportunities over [Z] consecutive sessions."
```

For ABLLS emerging skills (scored 1):
```typescript
// Similar structure, but ABLLS items don't have built-in goal templates
// Use category-level goal templates instead
```

### Interpretation Functions

```typescript
function getABLLSInterpretation(percentage: number): {
  level: string;
  description: string;
  recommendation: string;
}

function getVBMAPPInterpretation(delayStats: DelayStats): {
  level: string;
  description: string;
  recommendation: string;
}
```

---

## Acceptance Criteria

### Phase 1 Complete When:
- [x] Both summaries show clinical interpretation text
- [x] Interpretation updates dynamically based on scores
- [x] PDF includes interpretation section
- [x] VB-MAPP PDF shows age analysis
- [x] ABLLS shows age display
- [x] Priority intervention areas highlighted

### Phase 2 Complete When:
- [x] Suggested goals component displays emerging skills as goals
- [x] User can view/copy goal text
- [x] PDF includes goals section
- [x] Goals formatted for IEP documentation

### Phase 3 Complete When:
- [x] ABLLS shows age-based context
- [ ] Domain groupings visible in summary
- [ ] Domain scores in PDF

---

*Plan approved by: Development Team*
*Clinical review by: Corina*
