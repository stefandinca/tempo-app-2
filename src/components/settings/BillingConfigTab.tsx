"use client";

import { useState, useEffect } from "react";
import { useSystemSettings } from "@/hooks/useCollections";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { Loader2, Save, Building, FileText, Mail } from "lucide-react";

export default function BillingConfigTab() {
  const { data: settings, loading } = useSystemSettings();
  const { success, error } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Local state for the form
  const [formData, setFormData] = useState({
    clinic: {
      name: "",
      cui: "",
      regNo: "",
      address: "",
      bank: "",
      iban: "",
      email: "",
      phone: "",
    },
    invoicing: {
      seriesPrefix: "TMP",
      currentNumber: 1,
      defaultDueDays: 14,
      vatRate: 0,
      footerNotes: "",
    },
    emailTemplates: {
      subject: "Invoice #{series}-{number} from {clinic_name}",
      body: "Dear {client_name},\n\nPlease find attached the invoice for {month}.\n\nTotal Amount: {amount} RON\nDue Date: {due_date}\n\nThank you,\n{clinic_name}",
    }
  });

  // Populate form when data loads
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings
      }));
    }
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate IBAN (basic regex)
      const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
      if (formData.clinic.iban && !ibanRegex.test(formData.clinic.iban.replace(/\s/g, ''))) {
        throw new Error("Invalid IBAN format");
      }

      await setDoc(doc(db, "system_settings", "config"), formData, { merge: true });
      success("Billing configuration saved successfully");
    } catch (err: any) {
      console.error(err);
      error(err.message || "Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Section 1: Clinic Identity */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Clinic Identity</h3>
            <p className="text-sm text-neutral-500">Legal details for invoice headers.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Clinic Legal Name</label>
            <input 
              type="text" 
              placeholder="e.g. SC TEMPO THERAPY SRL"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.clinic.name}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, name: e.target.value } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Registration No. (CUI)</label>
            <input 
              type="text" 
              placeholder="e.g. RO12345678"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.clinic.cui}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, cui: e.target.value } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Commerce Registry No.</label>
            <input 
              type="text" 
              placeholder="e.g. J40/123/2020"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.clinic.regNo}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, regNo: e.target.value } }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Address</label>
            <textarea 
              rows={2}
              placeholder="Full legal address"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all resize-none"
              value={formData.clinic.address}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, address: e.target.value } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Bank Name</label>
            <input 
              type="text" 
              placeholder="e.g. Banca Transilvania"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.clinic.bank}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, bank: e.target.value } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">IBAN</label>
            <input 
              type="text" 
              placeholder="RO98 BTRL..."
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all font-mono text-sm"
              value={formData.clinic.iban}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, iban: e.target.value } }))}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Official Email</label>
            <input 
              type="email" 
              placeholder="billing@tempo.com"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.clinic.email}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, email: e.target.value } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Phone</label>
            <input 
              type="text" 
              placeholder="+40 7..."
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.clinic.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, clinic: { ...prev.clinic, phone: e.target.value } }))}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Invoice Parameters */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center text-secondary-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Invoice Parameters</h3>
            <p className="text-sm text-neutral-500">Defaults for automated generation.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Series Prefix</label>
            <input 
              type="text" 
              placeholder="e.g. TMP"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all uppercase"
              value={formData.invoicing.seriesPrefix}
              onChange={(e) => setFormData(prev => ({ ...prev, invoicing: { ...prev.invoicing, seriesPrefix: e.target.value.toUpperCase() } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Current Number</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.currentNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, invoicing: { ...prev.invoicing, currentNumber: parseInt(e.target.value) || 0 } }))}
            />
            <p className="text-xs text-neutral-500 mt-1">Will increment automatically.</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Payment Term (Days)</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.defaultDueDays}
              onChange={(e) => setFormData(prev => ({ ...prev, invoicing: { ...prev.invoicing, defaultDueDays: parseInt(e.target.value) || 0 } }))}
            />
          </div>
          
           <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">VAT Rate (%)</label>
            <input 
              type="number" 
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.vatRate}
              onChange={(e) => setFormData(prev => ({ ...prev, invoicing: { ...prev.invoicing, vatRate: parseFloat(e.target.value) || 0 } }))}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Default Footer Notes</label>
             <input 
              type="text" 
              placeholder="e.g. Thank you for your business!"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.footerNotes}
              onChange={(e) => setFormData(prev => ({ ...prev, invoicing: { ...prev.invoicing, footerNotes: e.target.value } }))}
            />
          </div>
        </div>
      </div>
      
      {/* Section 3: Email Templates */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-warning-100 dark:bg-warning-900/30 rounded-xl flex items-center justify-center text-warning-600">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">Email Template</h3>
            <p className="text-sm text-neutral-500">Customize the email sent to parents.</p>
          </div>
        </div>

        <div className="space-y-4">
           <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Subject Line</label>
            <input 
              type="text" 
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.emailTemplates?.subject}
              onChange={(e) => setFormData(prev => ({ ...prev, emailTemplates: { ...prev.emailTemplates, subject: e.target.value } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">Email Body</label>
            <textarea 
              rows={6}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all resize-none font-mono text-sm"
              value={formData.emailTemplates?.body}
              onChange={(e) => setFormData(prev => ({ ...prev, emailTemplates: { ...prev.emailTemplates, body: e.target.value } }))}
            />
            <p className="text-xs text-neutral-500 mt-2">
              Available variables: <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{client_name}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{month}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{amount}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{due_date}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{clinic_name}`}</code>
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? "Saving..." : "Save Configuration"}
        </button>
      </div>
    </div>
  );
}
