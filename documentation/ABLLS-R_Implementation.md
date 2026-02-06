# ABLLS-R Implementation Guide - Code Integration Phase

## 1. Status Update
- **Data Layer**: COMPLETED. Full ABLLS-R protocol (A-Z) extracted and structured in `src/data/ablls-r-protocol.ts`.
- **Seeding**: COMPLETED. `src/app/seed/page.tsx` updated to generate realistic data based on the full protocol.
- **Next Phase**: Integrating the new data structure into the application logic and UI.

## 2. Technical Plan

### Step 1: Type System Update (`src/types/evaluation.ts`)
The `Evaluation` interface needs to align with the new data structure.
- **Current**: Assumes `maxScore` is fixed or implicit.
- **New Requirement**: Explicitly handle `maxScore` from the protocol or store it in the evaluation document for historical accuracy (if protocol changes).
- **Action**:
    - Update `EvaluationScore` interface to potentially include metadata if needed, or rely on lookup.
    - Ensure `CategorySummary` correctly reflects the variable max scores.

### Step 2: Logic Update (`src/hooks/useEvaluations.ts`)
The calculation logic for progress bars and summaries must use the new protocol data.
- **Action**:
    - Import `ABLLS_PROTOCOL`.
    - In `calculateProgress`, iterate through the protocol to sum `maxScore` for all items, not just a fixed count.
    - Ensure backward compatibility if there are old evaluations (optional, but good practice).

### Step 3: UI Components Update
The `CategoryScoring` component is the core of the assessment interface.
- **File**: `src/components/evaluations/CategoryScoring.tsx` (or similar).
- **Changes**:
    - **Dynamic Scoring Buttons**: Instead of hardcoded `[0, 1, 2]`, render buttons based on `item.maxScore` (e.g., `[0, 1, 2, 3, 4]`).
    - **Protocol Details**: Add a "Question/SD" display. Show the `objective` and `criteria` in a collapsible detail view or tooltip.
    - **Text Content**: Use the Romanian text from `src/data/ablls-r-protocol.ts`.

### Step 4: Client Profile Integration
- Ensure the "Evaluations" tab in `ClientProfile` correctly displays the new summaries.
- Verify the "Radar Chart" (if exists) scales correctly (0-100% is safe, but raw scores will be higher).

## 3. Detailed Task List

1.  **Refactor Types**:
    ```typescript
    // src/types/evaluation.ts
    export interface EvaluationScore {
      score: number;
      notes?: string;
      updatedAt: string;
      // Optional: Store historical maxScore to freeze version
      maxScoreSnapshot?: number; 
    }
    ```

2.  **Update Scoring Component**:
    - Iterate `ABLLS_PROTOCOL` to find the current category.
    - Map items to UI rows.
    - Create a `ScoreButtonRow` component that accepts `maxScore` and renders the appropriate grid.

3.  **Visual Polish**:
    - Add "Info" icon for Objectives/SD.
    - Use color coding from the seed (if applicable) or standard ABLLS colors.

4.  **Testing**:
    - Run the seed script to populate DB.
    - Log in as therapist (`demo_therapist_001@tempoapp.ro` / `password`).
    - Open a client and verify the Evaluation tab.