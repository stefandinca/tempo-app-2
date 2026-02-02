# Settings & Configuration Module Documentation

**Module:** Settings
**Status:** In Development
**Target Roles:** All Users (Basic), Admin (Advanced)

---

## 1. Executive Summary

The Settings module serves a dual purpose: it is the personal control panel for individual users (Profile, Appearance) and the mission control for System Administrators. 

For **Phase 2**, we are expanding the Settings module to include a critical **Billing Configuration** tab. This allows Admins to define the legal and operational parameters required to **generate invoices**, a key requirement for the Billing module.

---

## 2. User Stories

### General User
*   **S-01:** As a User, I want to update my avatar and display name so my team can recognize me.
*   **S-02:** As a User, I want to toggle between Light and Dark mode to reduce eye strain.
*   **S-03:** As a User, I want to manage my email notification preferences.

### Administrator
*   **S-04:** As an Admin, I want to configure the Clinic's legal details (Name, Address, CUI, IBAN) so they appear correctly on generated invoices.
*   **S-05:** As an Admin, I want to set the default "Invoice Series" and "Start Number" (e.g., TMP-001) to ensure legal compliance.
*   **S-06:** As an Admin, I want to define the default payment due date offset (e.g., +15 days) for all new invoices.
*   **S-07:** As an Admin, I want to manage the list of "Services" and their default rates (linked to the Services module).

---

## 3. UX/UI Specification

### Layout Structure
The Settings page uses a **vertical tab layout** (Sidebar on Desktop, Drawer on Mobile) to accommodate growing configuration needs without clutter.

**Tabs:**
1.  **Profile** (All Users)
2.  **Notifications** (All Users)
3.  **Appearance** (All Users)
4.  **Security** (All Users)
5.  **Billing Configuration** (Admin Only - *NEW*)
6.  **System** (Admin Only - *NEW*)

### Detailed View: Billing Configuration (Admin)

This new section is critical for the "Invoice Generation" feature.

**Section 1: Clinic Identity**
*   **Input:** "Clinic Legal Name" (Text)
*   **Input:** "Registration Number (CUI/CIF)" (Text)
*   **Input:** "Commerce Registry No." (Text)
*   **Input:** "Address" (Text Area)
*   **Input:** "Bank Name" & "IBAN" (Text, validated for format)
*   *Why:* These fields are injected into the PDF Header of every invoice.

**Section 2: Invoice Parameters**
*   **Input:** "Invoice Series Prefix" (e.g., "TEMPO")
*   **Input:** "Current Number" (Number, auto-increments but manually adjustable)
*   **Input:** "Default VAT Rate" (Percentage, default 0%)
*   **Input:** "Payment Term" (Number of days, default 14)
*   *Why:* Automates the generation process so Admins don't type this every time.

**Section 3: Email Templates**
*   **Input:** "Invoice Email Subject"
*   **Input:** "Invoice Email Body" (Rich Text or Text Area with placeholders like `{client_name}`, `{month}`)
*   *Why:* Allows sending invoices directly to parents via email.

---

## 4. Technical Architecture

### Data Model (`firestore`)

We will use a singleton document pattern for system-wide settings to ensure consistency.

**Collection:** `system_settings`
**Document ID:** `config`

```typescript
interface SystemConfig {
  clinic: {
    name: string;
    cui: string;
    regNo: string;
    address: string;
    bank: string;
    iban: string;
    email: string;
    phone: string;
  };
  invoicing: {
    seriesPrefix: string;
    currentNumber: number;
    defaultDueDays: number;
    vatRate: number;
    footerNotes: string;
  };
  features: {
    enableParentPortal: boolean;
    enableAutoInvoicing: boolean;
  };
}
```

### Integration Points

1.  **Billing Module (`/billing`):**
    *   When an Admin clicks "Generate Invoice" for a client, the system fetches `system_settings/config`.
    *   It combines the **Clinic Info** (from Settings) + **Client Info** (from Clients) + **Session Data** (from Events) to create the PDF.

2.  **Context/State:**
    *   Use a `useSystemSettings` hook that subscribes to this document.
    *   Restricted read access: `allow read: if isAuthenticated();` (Basic info needed for UI).
    *   Restricted write access: `allow write: if isAdmin();`.

### Security Considerations

*   **IBAN Validation:** Validate IBAN structure on client-side before save.
*   **Role Protection:** The "Billing Configuration" tab must NOT render for non-admin users. This should be enforced by checking `user.role` in the component.

---

## 5. Development Plan

1.  **Phase 1: UI Expansion**
    *   Update `src/app/(dashboard)/settings/page.tsx` to include the `BillingConfigTab` component.
    *   Create `src/components/settings/BillingConfigTab.tsx`.

2.  **Phase 2: Database & Hooks**
    *   Create the `system_settings` collection in Firestore.
    *   Implement `useSystemSettings` hook in `src/hooks/useCollections.ts`.

3.  **Phase 3: Connection**
    *   Connect the Billing Module to read these settings when generating PDFs.

---

## 6. Team Debate & Resolution

**Point of Contention:** Should "Services" management be in Settings or its own module?
*   **Argument A (Settings):** It's a configuration list.
*   **Argument B (Module):** It's dynamic data that changes often and affects daily operations.
*   **Resolution:** Services gets its own module (`/services`) because it is high-touch. Settings is for low-touch, static configuration (like Company Address).

**Point of Contention:** Where does "Invoice Generation" happen?
*   **Resolution:** "Generation" is an action, "Configuration" is a setting. The *Action* happens in the Billing Page. The *Parameters* are set in the Settings Page. This separation of concerns prevents the Settings page from becoming an operational dashboard.
