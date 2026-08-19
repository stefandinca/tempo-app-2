import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { requireStaffRole } from '@/lib/serverAuth';

const SMARTBILL_API_URL = 'https://api.smartbill.ro/biz/eu/v1';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  // 0. Authorization — the role is read from a VERIFIED ID token, never from the
  // request body. This route previously trusted a `userRole` field in the JSON
  // payload, which any caller could set to "Admin".
  const auth = await requireStaffRole(req, ['Admin', 'Coordinator']);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { invoiceId, clientId, items, total, series, clinicCif } = await req.json();

    // 1. Basic Validation
    if (!invoiceId || !clientId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 1.5 Validate invoice items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invoice must have at least one item' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.description || typeof item.description !== 'string') {
        return NextResponse.json({ error: 'Each item must have a valid description' }, { status: 400 });
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0 || item.quantity > 10000) {
        return NextResponse.json({ error: `Invalid quantity for item "${item.description}"` }, { status: 400 });
      }
      if (typeof item.price !== 'number' || item.price < 0 || item.price > 1000000) {
        return NextResponse.json({ error: `Invalid price for item "${item.description}"` }, { status: 400 });
      }
    }

    // 2.5 Fetch Invoicing Settings for VAT Rate and Credentials.
    // Admin SDK: this runs server-side with no signed-in user, so the client SDK
    // was being denied by security rules and the route always failed with a 500.
    const db = adminDb();
    const settingsSnap = await db.collection("system_settings").doc("config").get();
    const settings: any = settingsSnap.exists ? settingsSnap.data() : {};
    
    const vatRate = settings.invoicing?.vatRate ?? 0;
    
    // 2. Fetch Client Data
    const clientSnap = await db.collection("clients").doc(clientId).get();
    if (!clientSnap.exists) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    const client: any = clientSnap.data();

    // Prioritize Firestore credentials over env variables
    const user = settings.integrations?.smartbill?.user || process.env.SMARTBILL_USER;
    const token = settings.integrations?.smartbill?.token || process.env.SMARTBILL_TOKEN;

    if (!user || !token) {
      return NextResponse.json({ error: 'SmartBill credentials not configured' }, { status: 500 });
    }

    // 3. Prepare SmartBill Payload
    // Referencing: https://api.smartbill.ro/#!/Invoices/createInvoice
    const payload = {
      companyVatCode: clinicCif || '', // Your clinic's CUI
      client: {
        name: client.name,
        vatCode: client.billingCif || '',
        address: client.billingAddress || '',
        email: client.parentEmail || '',
        isTaxPayer: false, // Usually false for individuals
      },
      seriesName: series || 'INV',
      isDraft: false,
      issueDate: new Date().toISOString().split('T')[0],
      products: items.map((item: any) => ({
        name: item.description,
        measuringUnitName: 'buc',
        currency: 'RON',
        isTaxIncluded: true,
        taxPercentage: vatRate, 
        quantity: item.quantity,
        price: item.price
      }))
    };

    // 4. Call SmartBill API
    const authHeader = Buffer.from(`${user}:${token}`).toString('base64');
    
    const response = await fetch(`${SMARTBILL_API_URL}/invoice`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('SmartBill Error:', result);
      return NextResponse.json({ error: result.errorText || 'SmartBill API Error' }, { status: response.status });
    }

    // 5. Update local invoice with SmartBill details
    await db.collection("invoices").doc(invoiceId).update({
      smartBillSeries: result.series,
      smartBillNumber: result.number,
      smartBillUrl: result.url,
      syncedToSmartBill: true,
      syncedAt: new Date().toISOString()
    });

    return NextResponse.json({ success: true, result });

  } catch (err: any) {
    console.error('API Route Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
