"use client";

import BillingOverview from "@/components/billing/BillingOverview";
import InvoiceList from "@/components/billing/InvoiceList";
import { Plus } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="flex-1 p-6 space-y-8">
      {/* Header Actions */}
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20">
          <Plus className="w-4 h-4" />
          Generate Invoice
        </button>
      </div>

      <BillingOverview />
      <InvoiceList />
    </div>
  );
}
