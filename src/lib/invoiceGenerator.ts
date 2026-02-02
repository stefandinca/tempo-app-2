import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
    cui?: string; // If company
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
}

export const generateInvoicePDF = (data: InvoiceData): Blob => {
  const doc = new jsPDF();

  // --- Header ---
  doc.setFontSize(20);
  doc.text("INVOICE", 150, 20);

  doc.setFontSize(10);
  doc.text(`Series: ${data.series}`, 150, 30);
  doc.text(`Number: ${data.number}`, 150, 35);
  doc.text(`Date: ${data.date}`, 150, 40);
  doc.text(`Due Date: ${data.dueDate}`, 150, 45);

  // Clinic Info (Left)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(data.clinic.name, 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  
  const clinicY = 25;
  let currentY = clinicY;
  const lineHeight = 5;

  doc.text(data.clinic.address, 14, currentY += lineHeight, { maxWidth: 80 });
  // Approximate height of address
  const addressLines = doc.splitTextToSize(data.clinic.address, 80).length;
  currentY += (addressLines - 1) * lineHeight;

  doc.text(`CUI: ${data.clinic.cui}`, 14, currentY += lineHeight);
  doc.text(`Reg. Com: ${data.clinic.regNo}`, 14, currentY += lineHeight);
  doc.text(`Bank: ${data.clinic.bank}`, 14, currentY += lineHeight);
  doc.text(`IBAN: ${data.clinic.iban}`, 14, currentY += lineHeight);
  doc.text(`Email: ${data.clinic.email}`, 14, currentY += lineHeight);

  // --- Bill To (Right, below invoice details) ---
  const billToY = 60;
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", 150, billToY);
  doc.setFont("helvetica", "normal");
  doc.text(data.client.name, 150, billToY + 5);
  if (data.client.address) {
    doc.text(data.client.address, 150, billToY + 10, { maxWidth: 50 });
  }

  // --- Table ---
  const tableY = Math.max(currentY + 15, 90);
  
  autoTable(doc, {
    startY: tableY,
    head: [["Description", "Qty", "Unit", "Price", "Amount"]],
    body: data.items.map(item => [
      item.description,
      item.quantity,
      item.unit,
      item.price.toFixed(2),
      item.amount.toFixed(2)
    ]),
    theme: 'striped',
    headStyles: { fillColor: [74, 144, 226] }, // Primary color
    foot: [["", "", "", "Total", `${data.total.toFixed(2)} ${data.currency}`]],
    footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // --- Footer ---
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(10);
  doc.text("Thank you for your business!", 14, finalY);
  
  doc.setFontSize(8);
  doc.text("This invoice was generated automatically by TempoApp.", 14, 280);

  return doc.output("blob");
};
