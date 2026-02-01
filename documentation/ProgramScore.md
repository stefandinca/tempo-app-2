# Program Scoring System: Technical & Functional Specification

This document details the clinical scoring system used by therapists to track client progress during sessions.

---

## 1. Overview
The scoring system is designed for high-frequency data collection during therapy sessions (e.g., ABA). Therapists record individual trial results using a simplified four-state counter system.

### The Scoring Metric
| Symbol | Meaning | Clinical Interpretation |
|:---:|:---|:---|
| **-** | Incorrect | The client failed to perform the task. |
| **0** | No Response | The client did not attempt or acknowledge the task. |
| **P** | Prompted | The client performed the task with assistance/prompting. |
| **+** | Correct | The client performed the task independently and correctly. |

---

## 2. User Stories

### Therapist Stories
- **T-S1:** As a Therapist, I want to see a list of programs specifically assigned to the client during a session so I know what to work on.
- **T-S2:** As a Therapist, I want to increment or decrement scores for each metric (-, 0, P, +) with a single tap so I don't lose focus on the client.
- **T-S3:** As a Therapist, I want to see a "Total Trials" count for each program in real-time so I can ensure I've met the session's requirements.

### Admin & Coordinator Stories
- **A-S1:** As a Coordinator, I want to view the aggregated scores of a completed session to verify data quality before generating reports.
- **A-S2:** As an Admin, I want to see progress trends (e.g., "+" percentage over time) to evaluate the effectiveness of an intervention plan.

### Parent Stories
- **P-S1:** As a Parent, I want to see how many successful trials my child completed in a session so I can understand their daily progress.

---

## 3. Technical Implementation

### Data Schema (Firestore)
Scores are stored within the `events` collection inside a `programScores` map.

```typescript
// events/{eventId}
{
  "clientId": "client_123",
  "programIds": ["prog_matching", "prog_imitation"],
  "programScores": {
    "prog_matching": {
      "-": 2,
      "0": 1,
      "P": 4,
      "+": 8
    },
    "prog_imitation": {
      "-": 0,
      "0": 0,
      "P": 2,
      "+": 10
    }
  }
}
```

### UI Component Specification
The `ProgramScoreCounter` component should:
1.  **State Management:** Use local state for immediate visual feedback, then sync to Firestore on "Save" or "Auto-save".
2.  **Interaction:** 
    - Large touch targets for mobile/tablet.
    - Haptic feedback (if possible) on increment.
    - Long-press or secondary button for decrement (to prevent accidental score inflation).
3.  **Visualization:** Display a "Success Rate" percentage: `(+) / (Total Trials) * 100`.

### Logic Helpers
```typescript
/**
 * Calculates total trials for a single program
 */
const calculateTotal = (scores) => {
  return Object.values(scores).reduce((a, b) => a + b, 0);
};

/**
 * Calculates success percentage (+)
 */
const calculateSuccessRate = (scores) => {
  const total = calculateTotal(scores);
  return total > 0 ? Math.round((scores['+'] / total) * 100) : 0;
};
```

---

## 4. Roadmap & Future Enhancements
- **Phase 2:** Real-time "Trial-by-Trial" logging (storing the exact sequence of responses with timestamps).
- **Phase 2:** Automatic "Mastery" detection (triggering a notification if a client hits 90% "+" over 3 consecutive sessions).
- **Phase 3:** Integration with "Evolution" charts (automatically plotting the daily success rate onto long-term progress graphs).
