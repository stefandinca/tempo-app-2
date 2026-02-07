export interface InvoiceData {
  series: string;
  number: number;
  date: string;
  dueDate: string;
  clinic: {
    name: string;
    address: string;
    cui: string;
    regNo: string;
    bank: string;
    iban: string;
    email: string;
    phone: string;
  };
  client: {
    name: string;
    address?: string;
    cif?: string; // CUI / CIF
    regNo?: string;
  };
  items: {
    description: string;
    quantity: number;
    unit: string;
    price: number;
    amount: number;
  }[];
  total: number;
  currency: string;
  vatRate?: number;
}

/**
 * Normalizes Romanian diacritics to their "standard" forms if the font 
 * still has trouble with the specific comma-below (ș, ț) vs cedilla (ş, ţ) variants.
 */
const normalizeDiacritics = (text: string = "") => {
  return text
    .replace(/ș/g, "s")
    .replace(/ț/g, "t")
    .replace(/Ș/g, "S")
    .replace(/Ț/g, "T")
    .replace(/ă/g, "a")
    .replace(/î/g, "i")
    .replace(/â/g, "a")
    .replace(/Ă/g, "A")
    .replace(/Î/g, "I")
    .replace(/Â/g, "A");
};

export const generateInvoicePDF = async (data: InvoiceData): Promise<Blob> => {
  // Dynamically import jsPDF and autoTable to reduce initial bundle size
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  
  // We use a small trick: if we can't embed a full font right now,
  // we will use the built-in fonts but replace the characters that the PDF 
  // viewer cannot render with their non-diacritic equivalents.
  // This is a "Safety First" approach so the invoice is readable.
  
  const doc = new jsPDF();
  const vatRate = data.vatRate || 0;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("FACTURA", 150, 20); // Removed diacritic from title for safety

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Serie: ${data.series}`, 150, 30);
  doc.text(`Numar: ${data.number}`, 150, 35);
  doc.text(`Data: ${data.date}`, 150, 40);
  doc.text(`Scadenta: ${data.dueDate}`, 150, 45);

  // Clinic Info (Furnizor)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Furnizor:", 14, 20);
  doc.text(normalizeDiacritics(data.clinic.name), 14, 26);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  let currentY = 31;
  const lineHeight = 5;

  const cleanAddress = normalizeDiacritics(data.clinic.address);
  doc.text(cleanAddress, 14, currentY, { maxWidth: 80 });
  const addressLines = doc.splitTextToSize(cleanAddress, 80).length;
  currentY += (addressLines) * lineHeight;

  doc.text(`CUI: ${data.clinic.cui}`, 14, currentY);
  doc.text(`Reg. Com: ${data.clinic.regNo}`, 14, currentY += lineHeight);
  doc.text(`Cont: ${data.clinic.iban}`, 14, currentY += lineHeight);
  doc.text(`Banca: ${normalizeDiacritics(data.clinic.bank)}`, 14, currentY += lineHeight);
  doc.text(`Email: ${data.clinic.email}`, 14, currentY += lineHeight);

  // Client Info (Cumparator)
  const billToY = 60;
  doc.setFont("helvetica", "bold");
  doc.text("Cumparator:", 150, billToY);
  doc.text(normalizeDiacritics(data.client.name), 150, billToY + 6);
  
  doc.setFont("helvetica", "normal");
  doc.text(`CIF/CNP: ${data.client.cif || "—"}`, 150, billToY + 11);
  if (data.client.regNo) {
    doc.text(`Reg. Com: ${data.client.regNo}`, 150, billToY + 16);
  }
  if (data.client.address) {
    doc.text(normalizeDiacritics(data.client.address), 150, billToY + 21, { maxWidth: 50 });
  }

  // --- Table ---
  const tableY = Math.max(currentY + 15, 95);
  
  const subtotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  const vatTotal = subtotal * (vatRate / 100);

  autoTable(doc, {
    startY: tableY,
    head: [["Nr.", "Denumire servicii", "U.M.", "Cantitate", "Pret unitar", "Valoare", "TVA"]],
    body: data.items.map((item, index) => [
      index + 1,
      normalizeDiacritics(item.description),
      item.unit,
      item.quantity.toFixed(2),
      item.price.toFixed(2),
      item.amount.toFixed(2),
      vatRate > 0 ? `${(item.amount * (vatRate/100)).toFixed(2)} (${vatRate}%)` : "0% (Scutit)"
    ]),
    theme: 'striped',
    headStyles: { fillColor: [74, 144, 226] },
    styles: { font: "helvetica" },
    foot: [
      ["", "", "", "", "", "Subtotal:", `${subtotal.toFixed(2)} RON`],
      ["", "", "", "", "", `TVA (${vatRate}%):`, `${vatTotal.toFixed(2)} RON`],
      ["", "", "", "", "", "Total de plata:", `${data.total.toFixed(2)} RON`]
    ],
    footStyles: { fillColor: [245, 245, 245], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // --- Footer ---
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.text("Va multumim pentru colaborare!", 14, finalY);
  
  doc.setFontSize(8);
  doc.text("Aceasta factura a fost generata automat prin platforma TempoApp.", 14, 280);

  return doc.output("blob");
};
