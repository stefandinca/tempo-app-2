 ---                                                                                                  Team Discussion: ABLLS Evaluation Feature
                                                                                                     
  ---
  PM (Project Manager): Let's kick off the discussion for our new evaluation feature, starting with
  ABLLS. Corina, can you give us context on how ABLLS assessments work in practice?

  ---
  Corina (Clinical Director): Of course. ABLLS-R (Assessment of Basic Language and Learning Skills - 
  Revised) is one of the most widely used assessment tools in ABA therapy for children with autism.  
  Here's how we use it:

  What is ABLLS?

  ABLLS measures 544 skills across 25 skill areas in the full version. Our simplified version has 18 
  categories (A-R) with 10 items each = 180 skills. Each skill is scored on a scale:

  - 0 = Skill not present / not observed
  - 1 = Skill emerging / inconsistent (needs prompts)
  - 2 = Skill acquired / mastered (independent)

  Clinical Workflow

  1. Initial Evaluation: When a child starts therapy, we conduct a comprehensive ABLLS assessment    
  (takes 2-4 sessions)
  2. Baseline Establishment: Results establish the child's baseline across all domains
  3. Treatment Planning: Low-scoring areas inform the intervention plan and therapy goals
  4. Re-evaluation: Every 3-6 months, we re-assess to measure progress
  5. Progress Tracking: Comparing evaluations shows growth over time - this is CRITICAL for parents  
  and funding bodies

  Key Requirements from Clinical Perspective

  - Partial saves: Therapists often can't complete 180 items in one session
  - Notes per item: Sometimes we need to document WHY a score was given
  - Category summaries: Parents want to see "Language: 65%" not raw scores
  - Visual progress: Charts showing improvement between evaluations are essential for parent meetings
   and insurance reports

  ---
  Lead UX Researcher: That's incredibly helpful, Corina. Let me map out the user journeys:

  User Journey 1: Creating an Evaluation

  Therapist selects client → Starts new ABLLS evaluation →
  Assessment interface (category-by-category) →
  Can save partial progress → Complete evaluation →
  View summary results

  User Journey 2: Re-evaluation

  Therapist views client's previous evaluation →
  Starts re-evaluation (pre-filled with previous scores for reference) →
  Updates scores → Saves →
  System auto-generates comparison view

  User Journey 3: Parent Views Progress

  Parent logs in → Views child's evaluations →
  Sees progress chart → Can download PDF report

  Key UX Insights:
  - The 180 items are overwhelming. We need progressive disclosure - show one category at a time     
  - Quick scoring: Tap/click scoring (0, 1, 2) without typing
  - Progress indicator: Show completion % during assessment
  - Autosave: Don't lose work

  ---
  Senior Software Developer: Based on this, here's my proposed data architecture:

  Firestore Data Model

  // Collection: clients/{clientId}/evaluations/{evaluationId}
  interface Evaluation {
    id: string;
    clientId: string;
    type: 'ABLLS' | 'VB-MAPP' | 'other';  // Extensible for future
    version: string;  // 'ABLLS-R-v1'

    // Metadata
    createdAt: Timestamp;
    updatedAt: Timestamp;
    completedAt: Timestamp | null;  // null = in progress

    evaluatorId: string;  // Team member who conducted
    evaluatorName: string;  // Denormalized for display

    status: 'in_progress' | 'completed';

    // Scores stored as a map for efficient updates
    scores: {
      [itemId: string]: {
        score: 0 | 1 | 2;
        note?: string;
        updatedAt: Timestamp;
      }
    };

    // Computed summaries (updated on save)
    categorySummaries: {
      [categoryKey: string]: {
        totalItems: number;
        scoredItems: number;
        totalScore: number;
        maxPossibleScore: number;
        percentage: number;
      }
    };

    overallPercentage: number;
    previousEvaluationId?: string;  // For re-evaluations
  }

  Why This Structure?

  1. Subcollection under clients: Natural data locality, easy security rules
  2. Scores as a map: Firestore allows updating individual fields without rewriting entire document  
  3. Pre-computed summaries: Avoid expensive client-side calculations
  4. Status field: Distinguishes draft from completed evaluations

  ---
  UI Designer: Here's my vision for the UI components:

  1. Evaluation Creation Flow

  ┌─────────────────────────────────────────────┐
  │  New ABLLS Evaluation for [Client Name]     │
  ├─────────────────────────────────────────────┤
  │  Progress: ████████░░░░░ 67% (12/18 sections)│
  ├─────────────────────────────────────────────┤
  │  [A] [B] [C] [D] [E] [F] [G] [H] [I]       │ ← Category pills
  │  [J] [K] [L] [M] [N] [O] [P] [Q] [R]       │   (filled = done)
  ├─────────────────────────────────────────────┤
  │  Section D: Vorbire si Limbaj Receptiv      │
  │                                             │
  │  D1. Răspunde la numele său                 │
  │      [0] [1] [2]  📝                        │
  │                                             │
  │  D2. Identifică 5 obiecte familiare         │
  │      [0] [1] [2]  📝                        │
  │                                             │
  │  ...                                        │
  ├─────────────────────────────────────────────┤
  │  [← Previous]              [Save & Continue]│
  │                            [Save as Draft]  │
  └─────────────────────────────────────────────┘

  2. Results Display (Radar Chart + Category Bars)

  ┌─────────────────────────────────────────────┐
  │  ABLLS Evaluation Results                   │
  │  Client: Maria P. | Date: Jan 15, 2026      │
  ├─────────────────────────────────────────────┤
  │         [Radar Chart View]                  │
  │              A                              │
  │           R     B                           │
  │         Q    ●    C                         │
  │        P    / \    D                        │
  │         O  /   \  E                         │
  │          N  ---  F                          │
  │           M     G                           │
  │            L   H                            │
  │              I J K                          │
  ├─────────────────────────────────────────────┤
  │  Category Breakdown:                        │
  │  A - Cooperation    ████████░░ 80%          │
  │  B - Visual         ██████░░░░ 60%          │
  │  C - Motor Imit.    █████████░ 90%          │
  │  ...                                        │
  ├─────────────────────────────────────────────┤
  │  [Download PDF] [Start Re-evaluation]       │
  └─────────────────────────────────────────────┘

  3. Progress Comparison (Line Chart)

  ┌─────────────────────────────────────────────┐
  │  Progress Over Time                         │
  ├─────────────────────────────────────────────┤
  │  100%│                          ●──●        │
  │      │                    ●────●            │
  │   75%│              ●────●                  │
  │      │        ●────●                        │
  │   50%│  ●────●                              │
  │      │                                      │
  │   25%│                                      │
  │      └──────────────────────────────────────│
  │        Jan    Apr    Jul    Oct    Jan      │
  │        2025   2025   2025   2025   2026     │
  ├─────────────────────────────────────────────┤
  │  Filter: [All Categories ▼] [Compare ▼]     │
  └─────────────────────────────────────────────┘

  ---
  Corina (Clinical Director): This looks great! A few clinical additions:

  Re-evaluation Best Practices

  1. Show previous scores: During re-eval, display the old score next to each item (grayed out) so   
  the therapist can compare
  2. Highlight changes: After completion, show items that improved (green), regressed (red), or      
  stayed same
  3. Time between evaluations: Display "3 months since last evaluation" - important for clinical     
  validity

  Scoring Guide Tooltips

  Each score should have a tooltip explaining:
  - 0: "Not observed or unable to perform"
  - 1: "Emerging - performs with prompts or inconsistently"
  - 2: "Mastered - performs independently and consistently"

  Category Alerts

  If a category score drops significantly (>20% decrease), flag it for clinical review.

  ---
  PM (Project Manager): Excellent discussion! Let me summarize our implementation plan:

  Implementation Plan

  Phase 1: Core Evaluation (MVP)

  1. Data model: Create evaluation schema in Firestore
  2. Create evaluation: Wizard-style interface, category-by-category
  3. Score items: Quick tap scoring (0, 1, 2)
  4. Save draft: Partial completion support
  5. Complete evaluation: Mark as done, compute summaries

  Phase 2: Results Display

  1. Summary view: Category percentages with progress bars
  2. Radar chart: Visual overview of all categories
  3. Detail view: Expandable categories showing individual items

  Phase 3: Re-evaluation & Progress

  1. Start re-evaluation: Clone previous, show comparison
  2. Progress chart: Line chart over time
  3. Comparison view: Side-by-side evaluations
  4. PDF export: Downloadable reports

  Phase 4: Parent Access

  1. Parent portal integration: View evaluations
  2. Simplified view: Less clinical jargon
  3. Progress highlights: "Your child improved in 5 areas!"

  ---
  Senior Software Developer: Should I proceed with the implementation? I'll start with:

  1. Types & data model (src/types/evaluation.ts)
  2. Firebase hooks (src/hooks/useEvaluations.ts)
  3. Evaluation components (src/components/evaluations/)
  4. Client profile integration (new "Evaluations" tab)

  ---
  Team Consensus: Approved. Let's proceed with Phase 1.

  ---
  Would you like me to proceed with implementing Phase 1 of the ABLLS evaluation feature? This would 
  include:

  1. Creating the TypeScript types and data model
  2. Building the evaluation creation wizard UI
  3. Adding an "Evaluations" tab to the client profile
  4. Implementing scoring and draft saving functionality