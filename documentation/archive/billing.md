> ⚠️ **STALE — ARCHIVED.** This document is kept for reference and is no longer
> maintained. It may describe a version of the product or its infrastructure that
> no longer exists. **Verify against the code before trusting anything here.**
> Current documentation lives in `documentation/`.


Team Review: Billing System
                                                                                                                
  Current State Assessment

  - Billing page exists with mock data only
  - KPI cards (Revenue, Pending, Paid) use hardcoded values
  - Invoice list shows static mock data
  - Services already have basePrice field ✓
  - Team members missing hourlyRate field ✗
  - Clients missing hasSubscription, subscriptionAmount, discountRate fields ✗

  ---
  Senior PM Assessment

  Spec Review:
  The specification is well-structured with clear phases. However, there are gaps:
  ┌─────────────────────────────┬──────────────┬───────────────────────────────────────────────┐
  │         Requirement         │ Spec Status  │                    Concern                    │
  ├─────────────────────────────┼──────────────┼───────────────────────────────────────────────┤
  │ Monthly billing aggregation │ ✅ Defined   │ -                                             │
  ├─────────────────────────────┼──────────────┼───────────────────────────────────────────────┤
  │ Client invoices             │ ✅ Defined   │ -                                             │
  ├─────────────────────────────┼──────────────┼───────────────────────────────────────────────┤
  │ Team payouts                │ ✅ Defined   │ Missing hourlyRate field                      │
  ├─────────────────────────────┼──────────────┼───────────────────────────────────────────────┤
  │ Subscription billing        │ ⚠️ Mentioned │ Not fully specified                           │
  ├─────────────────────────────┼──────────────┼───────────────────────────────────────────────┤
  │ Invoice persistence         │ ❌ Missing   │ Invoices should be saved, not just calculated │
  ├─────────────────────────────┼──────────────┼───────────────────────────────────────────────┤
  │ Payment tracking            │ ⚠️ Vague     │ Need invoices collection                      │
  └─────────────────────────────┴──────────────┴───────────────────────────────────────────────┘
  Recommendation: Add an invoices collection to persist generated invoices with payment status, rather than     
  recalculating each time.

  ---
  Senior Developer Assessment

  Data Model Gaps:

  // MISSING: invoices collection
  // invoices/{invoiceId}
  {
    id: string;
    clientId: string;
    month: string;           // "2026-02"
    lineItems: [{
      eventId: string;
      date: string;
      serviceType: string;
      duration: number;
      amount: number;
    }];
    subtotal: number;
    discount: number;
    total: number;
    status: "draft" | "sent" | "paid" | "overdue";
    paidAt?: string;
    createdAt: string;
  }

  // MISSING in team_members:
  {
    hourlyRate: number;      // e.g., 50.00 RON/hour
  }

  // MISSING in clients:
  {
    hasSubscription: boolean;
    subscriptionAmount?: number;
    discountRate?: number;   // 0.10 = 10%
  }

  Calculation Logic:
  // Utility function needed
  function calculateClientBilling(clientId: string, month: string) {
    // 1. Fetch all completed events for client in month
    // 2. For each event, lookup service basePrice
    // 3. Calculate: (duration / 60) * basePrice
    // 4. Apply subscription/discount if applicable
    // 5. Return line items + totals
  }

  Technical Concerns:
  1. Currency: Spec uses $ but services use RON — need consistency
  2. Timezone handling: Month boundaries need careful handling
  3. Performance: Aggregating many events could be slow — consider Cloud Function for heavy months

  Recommendation: Create invoices collection, add missing schema fields, use RON consistently.

  ---
  Lead UX Researcher Assessment

  Workflow Analysis:
  ┌──────────────────────┬────────────────────┬──────────────────────────────────────────┐
  │      User Task       │  Current Support   │               Recommended                │
  ├──────────────────────┼────────────────────┼──────────────────────────────────────────┤
  │ View monthly summary │ ✅ KPI cards exist │ Connect to real data                     │
  ├──────────────────────┼────────────────────┼──────────────────────────────────────────┤
  │ See client breakdown │ ⚠️ Table exists    │ Add expandable rows with session details │
  ├──────────────────────┼────────────────────┼──────────────────────────────────────────┤
  │ Mark invoice paid    │ ❌ Not functional  │ Add quick action + confirmation          │
  ├──────────────────────┼────────────────────┼──────────────────────────────────────────┤
  │ Generate PDF         │ ❌ Not implemented │ Phase 2 feature                          │
  ├──────────────────────┼────────────────────┼──────────────────────────────────────────┤
  │ Switch months        │ ❌ No selector     │ Add month picker to header               │
  ├──────────────────────┼────────────────────┼──────────────────────────────────────────┤
  │ Team payouts         │ ❌ Not shown       │ Add tab or separate section              │
  └──────────────────────┴────────────────────┴──────────────────────────────────────────┘
  UX Improvements Needed:

  1. Month Selector — Critical for navigating billing periods
  2. Expandable Rows — Click client row to see session breakdown
  3. Status Quick Toggle — Mark as paid without opening modal
  4. Empty State — Show helpful message when no sessions in month
  5. Tab Navigation — Separate "Client Invoices" from "Team Payouts"

  Recommendation: Add month selector first, then tabs for invoices/payouts.

  ---
  UI Designer Assessment

  Proposed Layout:

  ┌─────────────────────────────────────────────────────────────────────┐
  │  BILLING                                    [◀ Jan 2026 ▶] [Export]│
  ├─────────────────────────────────────────────────────────────────────┤
  │                                                                     │
  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
  │  │ 💰 Revenue   │  │ ⏳ Pending   │  │ ✅ Collected │              │
  │  │   45,230 RON │  │   12,450 RON │  │   32,780 RON │              │
  │  │   +12% ↑     │  │   8 invoices │  │  34 invoices │              │
  │  └──────────────┘  └──────────────┘  └──────────────┘              │
  │                                                                     │
  │  ┌─────────────────────────────────────────────────────────────┐   │
  │  │ [Client Invoices]  [Team Payouts]                           │   │
  │  ├─────────────────────────────────────────────────────────────┤   │
  │  │ Client         │ Sessions │ Hours │ Amount   │ Status │ ⋮   │   │
  │  ├─────────────────────────────────────────────────────────────┤   │
  │  │ ▶ Ion Popescu  │    12    │  18h  │ 3,510 RON│ ● Paid │     │   │
  │  │ ▶ Maria Ionescu│     8    │  12h  │ 2,340 RON│ ○ Pending    │   │
  │  │   ├─ Feb 5: ABA Session (90min) - 292.50 RON               │   │
  │  │   ├─ Feb 7: Speech (60min) - 195.00 RON                    │   │
  │  │   └─ ...                                                    │   │
  │  └─────────────────────────────────────────────────────────────┘   │
  │                                                                     │
  │  [Generate All Invoices]                                           │
  └─────────────────────────────────────────────────────────────────────┘

  Design Tokens:
  - Use existing card/table patterns
  - Status badges: Paid (green), Pending (yellow), Overdue (red)
  - Expandable rows with subtle animation
  - Currency: RON (matching services)

  ---
  Team Consensus
  ┌────────────────────────────────────┬───────────────────────────┐
  │              Decision              │           Vote            │
  ├────────────────────────────────────┼───────────────────────────┤
  │ Create invoices collection         │ ✅ Unanimous              │
  ├────────────────────────────────────┼───────────────────────────┤
  │ Add hourlyRate to team_members     │ ✅ Unanimous              │
  ├────────────────────────────────────┼───────────────────────────┤
  │ Add subscription fields to clients │ ✅ 3/4 (defer to Phase 2) │
  ├────────────────────────────────────┼───────────────────────────┤
  │ Use RON currency consistently      │ ✅ Unanimous              │
  ├────────────────────────────────────┼───────────────────────────┤
  │ Add month selector                 │ ✅ Unanimous              │
  ├────────────────────────────────────┼───────────────────────────┤
  │ Add tabs for Invoices/Payouts      │ ✅ Unanimous              │
  └────────────────────────────────────┴───────────────────────────┘
  ---
  Implementation Order

  1. Schema updates — Add hourlyRate to team_members
  2. Month selector — Add to billing page header
  3. Real data integration — Replace mock data with Firestore queries
  4. KPI calculations — Aggregate completed events by month
  5. Client invoice table — Expandable rows with session breakdown
  6. Team payouts tab — Calculate based on hourlyRate
  7. Invoice actions — Mark as paid, generate PDF (Phase 2)

  ---
  Progress Update (Feb 2, 2026)

  ✅ Settings Integration Complete
  - Added "Billing Config" tab to Settings page (Admin only).
  - Configurable: Clinic Identity (Name, Address, CUI, IBAN) and Invoice Parameters (Series, Number, Due Date).
  - Persistence: Saves to `system_settings/config` in Firestore.

  ✅ PDF Invoice Generation Complete
  - Implemented client-side PDF generation using `jspdf` + `jspdf-autotable`.
  - Added "Generate Invoice" action to Client Invoice table row menu.
  - Generates professional PDF with clinic header, client details, and itemized session table.
  - Status: Generates and downloads locally.

  🚧 Next Steps
  - Upload generated PDFs to Firebase Storage.
  - Save `invoice` document to Firestore for Parent Portal access.
  - Batch generation for all invoices in a month.
