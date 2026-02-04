# Phase 3: Commercialization & Clinical Depth

**Status:** Planned
**Target Timeline:** 4-6 Weeks
**Focus:** Payment Processing, Security Hardening, and Advanced Clinical Features

---

## 1. Executive Summary

We have successfully completed **Phase 2 (Billing & Portal Foundation)**. The application now supports full invoice generation, recurring events, and a functional Parent Portal for viewing schedules and invoices.

**Phase 3** is about closing the loop on **revenue collection** (getting paid online) and deepening the **clinical value** (tracking patient progress over time). We will also address the security debt in the Parent Portal authentication.

---

## 2. Priority 1: Payment Processing (Revenue)

*   **Goal:** Allow parents to pay outstanding invoices directly inside the portal.
*   **Tech Stack:** Stripe Connect (or Standard) + Firebase Cloud Functions.
*   **Workflow:**
    1.  Parent clicks "Pay Online".
    2.  System calls Cloud Function `createStripeCheckoutSession`.
    3.  Parent is redirected to Stripe Hosted Checkout.
    4.  Stripe Webhook (`checkout.session.completed`) triggers Cloud Function.
    5.  Cloud Function updates `invoices/{id}` status to `paid` and creates a `payment` record.
*   **UI Work:** Update `ParentBillingPage` to handle the redirect and success/cancel states.

---

## 3. Priority 2: Security Hardening (Trust)

*   **Goal:** Replace the "Client Code" mechanism with secure authentication.
*   **Problem:** Currently, anyone with the 6-digit code can view invoices (if they guess it).
*   **Solution:** **Magic Link Login**.
    *   Admin sets parent email in Client Profile.
    *   Parent enters email -> receives link.
    *   Firebase Auth logs them in.
    *   Custom Claim `childId` is added to their token.
    *   Firestore Rules updated to `request.auth.token.childId == resource.data.clientId`.

---

## 4. Priority 3: Evolution Tracking (Clinical)

*   **Goal:** Visualize client progress over time (e.g., "Visual Matching" skill acquisition).
*   **Data Model:**
    *   Create `evaluations` sub-collection for periodic assessments (ABLLS-R, VB-MAPP).
    *   Aggregated view of daily session scores (already collecting `programScores`, need to visualize trends).
*   **UI:**
    *   **Clinical Dashboard:** New tab in Client Profile.
    *   **Charts:** Line graphs showing % correct over time per program.

---

## 5. Priority 4: Notifications & Communication

*   **Goal:** Keep parents engaged and informed.
*   **Features:**
    *   **Invoice Emails:** Automatically email the PDF (or link) when generated.
    *   **Daily Reports:** Email a summary of the session notes (if public).
*   **Tech:** Resend or SendGrid integration via Cloud Functions.

---

## 6. Known Issues / Tech Debt to Address

1.  **Mobile Navigation:** The "Services" button was added to the mobile drawer but space is tight. Review mobile IA.
2.  **Performance:** `useEventsByMonth` fetches all events. As data grows, we need pagination or summary documents.
3.  **PDF Fonts:** `jspdf` default fonts don't support all Romanian diacritics perfectly. Need to embed a custom font (Roboto/OpenSans) for professional invoices.

---

## 7. Immediate Next Session Goals

1.  **Set up Stripe Account** (Sandbox).
2.  **Initialize Firebase Cloud Functions** environment.
3.  **Implement `createCheckoutSession`** endpoint.
