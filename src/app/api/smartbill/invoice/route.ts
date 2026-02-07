import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const SMARTBILL_API_URL = 'https://api.smartbill.ro/biz/eu/v1';

export async function POST(req: NextRequest) {
  try {
    const { invoiceId, clientId, items, total, series, clinicCif } = await req.json();

    // 1. Basic Validation
    if (!invoiceId || !clientId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 2.5 Fetch Invoicing Settings for VAT Rate and Credentials
    const settingsRef = doc(db, "system_settings", "config");
    const settingsSnap = await getDoc(settingsRef);
    const settings = settingsSnap.exists() ? settingsSnap.data() : {};
    
    const vatRate = settings.invoicing?.vatRate ?? 0;
    
    // 2. Fetch Client Data
    const clientRef = doc(db, "clients", clientId);
    const clientSnap = await getDoc(clientRef);
    if (!clientSnap.exists()) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }
    const client = clientSnap.data();

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
    const localInvoiceRef = doc(db, "invoices", invoiceId);
    await updateDoc(localInvoiceRef, {
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
