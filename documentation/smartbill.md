# SmartBill Integration Guide

TempoApp v2 now supports official Romanian invoicing via the **SmartBill API**. This integration allows admins to sync locally generated session summaries into official tax-compliant invoices with a single click.

---

## 1. Feature Overview

The integration bridges the gap between clinical session tracking and official accounting.
*   **Secure Proxy:** All API calls are handled server-side to protect your SmartBill credentials.
*   **Client Data Management:** Extended client profiles to store CIF/CUI and billing addresses.
*   **One-Click Sync:** Generate a local summary first, then sync it to SmartBill.
*   **Automated Tracking:** Stores SmartBill invoice numbers and PDF links back into Firestore for easy access.

---

## 2. Developer Documentation

### Environment Variables
To enable the integration, the following variables must be set in your `.env.live` file (or server environment):

```env
SMARTBILL_USER=your_email@example.com
SMARTBILL_TOKEN=your_api_key_from_smartbill
```

### Architecture
*   **API Route:** `src/app/api/smartbill/invoice/route.ts`
    *   Handles the POST request from the frontend.
    *   Constructs the `Basic Auth` header.
    *   Formats the clinical sessions into SmartBill "products".
    *   Updates the Firestore `invoices` collection with the result.
*   **Data Structure:**
    *   Clients now have: `billingAddress`, `billingCif`, `billingRegNo`.
    *   Invoices now store: `smartBillSeries`, `smartBillNumber`, `smartBillUrl`, `syncedToSmartBill`.

### Local Testing
The sync feature is **disabled in Demo mode** (`IS_DEMO = true`) to prevent accidental API calls during testing. To test locally, ensure `NEXT_PUBLIC_APP_ENV` is not set to `demo`.

---

## 3. Admin User Guide

### Step 1: Update Client Profiles
Before you can generate a SmartBill invoice, you must provide the client's legal billing details:
1.  Go to **Clients** and open a profile.
2.  Click **Edit Profile**.
3.  Scroll to the **Billing Information (SmartBill)** section.
4.  Enter the **Billing Address** and **CIF / CUI** (e.g., CNP for individuals or CUI for companies).
5.  Click **Save Changes**.

### Step 2: Ensure Clinic Details are Set
Your own clinic's CIF is required for the API call:
1.  Go to **Settings > Billing Config**.
2.  Ensure your **Clinic CIF / CUI** is correctly entered.

### Step 3: Generate and Sync
1.  Go to the **Billing** page.
2.  Under the **Client Invoices** tab, find the client you want to bill.
3.  Click the **More (...)** icon on the right.
4.  First, click **Generate Invoice** to create the local session summary.
5.  Once generated, click the **More (...)** icon again and select **Sync to SmartBill**.
6.  The status will update once the official invoice is created in your SmartBill account.

---

## 4. Next Steps & Best Practices

1.  **VAT Configuration:** The current integration defaults to **0% VAT** (typical for medical/clinical services in Romania). If your clinic is a VAT payer, the `taxPercentage` value in the API route should be updated to `19` or your specific rate.
2.  **Series Name:** Ensure the `seriesName` passed to the API (defaulting to 'INV') matches a series already created in your SmartBill account settings.
3.  **Error Logging:** If a sync fails, check the browser console for specific error messages returned by SmartBill (e.g., "Invalid CIF format" or "Series not found").
4.  **Bulk Sync:** A future improvement could include a "Sync All" button to process all issued invoices for the month in one batch.
