"use client";

import { useState, useEffect } from "react";
import { useSystemSettings } from "@/hooks/useCollections";
import { db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { Loader2, Save, Building, FileText, Mail, Share2, Key, Plus, Trash2, CheckCircle2, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { clsx } from "clsx";

interface LegalEntity {
  id: string;
  name: string;
  cui: string;
  regNo: string;
  address: string;
  bank: string;
  iban: string;
  email: string;
  phone: string;
  isDefault?: boolean;
}

export default function BillingConfigTab() {
  const { t } = useTranslation();
  const { data: settings, loading } = useSystemSettings();
  const { success, error } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);

  // Local state for the form
  const [formData, setFormData] = useState<any>({
    legalEntities: [],
    defaultEntityId: "",
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
    },
    integrations: {
      smartbill: {
        user: "",
        token: "",
      }
    }
  });

  // Populate form when data loads
  useEffect(() => {
    if (settings) {
      const migratedData = { ...settings };
      
      // Migration logic: if old 'clinic' exists and 'legalEntities' doesn't, migrate it
      if (settings.clinic && (!settings.legalEntities || settings.legalEntities.length === 0)) {
        const defaultId = "default-entity";
        migratedData.legalEntities = [{
          ...settings.clinic,
          id: defaultId,
          isDefault: true
        }];
        migratedData.defaultEntityId = defaultId;
        delete migratedData.clinic;
      }

      setFormData((prev: any) => ({
        ...prev,
        ...migratedData,
        integrations: {
          ...prev.integrations,
          ...(migratedData.integrations || {})
        }
      }));

      if (migratedData.legalEntities?.length > 0) {
        setActiveEntityId(migratedData.defaultEntityId || migratedData.legalEntities[0].id);
      }
    }
  }, [settings]);

  const activeEntity = formData.legalEntities?.find((e: LegalEntity) => e.id === activeEntityId);

  const handleEntityChange = (field: keyof LegalEntity, value: string) => {
    setFormData((prev: any) => ({
      ...prev,
      legalEntities: prev.legalEntities.map((e: LegalEntity) => 
        e.id === activeEntityId ? { ...e, [field]: value } : e
      )
    }));
  };

  const addEntity = () => {
    const newId = crypto.randomUUID();
    const newEntity: LegalEntity = {
      id: newId,
      name: t('settings.billing_config.legal_entities.new_entity_name'),
      cui: "",
      regNo: "",
      address: "",
      bank: "",
      iban: "",
      email: "",
      phone: "",
    };

    setFormData((prev: any) => {
      const entities = [...(prev.legalEntities || []), newEntity];
      return {
        ...prev,
        legalEntities: entities,
        defaultEntityId: prev.defaultEntityId || newId
      };
    });
    setActiveEntityId(newId);
  };

  const deleteEntity = (id: string) => {
    if (formData.legalEntities.length <= 1) {
      error(t('settings.billing_config.legal_entities.error_min_one'));
      return;
    }

    setFormData((prev: any) => {
      const filtered = prev.legalEntities.filter((e: LegalEntity) => e.id !== id);
      let newDefault = prev.defaultEntityId;
      if (id === prev.defaultEntityId) {
        newDefault = filtered[0].id;
      }
      return {
        ...prev,
        legalEntities: filtered,
        defaultEntityId: newDefault
      };
    });

    if (activeEntityId === id) {
      setActiveEntityId(formData.legalEntities.find((e: LegalEntity) => e.id !== id).id);
    }
  };

  const setAsDefault = (id: string) => {
    setFormData((prev: any) => ({
      ...prev,
      defaultEntityId: id
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Validate IBANs
      for (const entity of formData.legalEntities) {
        const ibanRegex = /^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/;
        if (entity.iban && !ibanRegex.test(entity.iban.replace(/\s/g, ''))) {
          throw new Error(t('settings.billing_config.legal_entities.invalid_iban_for_entity', { name: entity.name }));
        }
      }

      await setDoc(doc(db, "system_settings", "config"), formData, { merge: true });
      success(t('settings.billing_config.save_success'));
    } catch (err: any) {
      console.error(err);
      error(err.message || t('settings.billing_config.save_error'));
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

      {/* Section 1: Legal Entities */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-primary-600">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">{t('settings.billing_config.legal_entities.title')}</h3>
              <p className="text-sm text-neutral-500">{t('settings.billing_config.legal_entities.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={addEntity}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 rounded-lg text-sm font-bold hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('settings.billing_config.legal_entities.add_button')}
          </button>
        </div>

        {/* Entity Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          {formData.legalEntities?.map((entity: LegalEntity) => (
            <div key={entity.id} className="relative group">
              <button
                onClick={() => setActiveEntityId(entity.id)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2",
                  activeEntityId === entity.id
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-500/20"
                    : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                )}
              >
                {entity.name || t('settings.billing_config.legal_entities.unnamed_entity')}
                {formData.defaultEntityId === entity.id && <CheckCircle2 className="w-3.5 h-3.5" />}
              </button>
              {formData.legalEntities.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteEntity(entity.id); }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-error-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
        </div>

        {activeEntity ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-neutral-900 dark:text-white">{t('settings.billing_config.legal_entities.editing')}: {activeEntity.name}</h4>
              {formData.defaultEntityId !== activeEntity.id && (
                <button 
                  onClick={() => setAsDefault(activeEntity.id)}
                  className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {t('settings.billing_config.legal_entities.set_default')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.legal_name')}</label>
                <input
                  type="text"
                  placeholder={t('settings.billing_config.clinic.legal_name_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                  value={activeEntity.name}
                  onChange={(e) => handleEntityChange('name', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.cui')}</label>
                <input
                  type="text"
                  placeholder={t('settings.billing_config.clinic.cui_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                  value={activeEntity.cui}
                  onChange={(e) => handleEntityChange('cui', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.reg_no')}</label>
                <input
                  type="text"
                  placeholder={t('settings.billing_config.clinic.reg_no_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                  value={activeEntity.regNo}
                  onChange={(e) => handleEntityChange('regNo', e.target.value)}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.address')}</label>
                <textarea
                  rows={2}
                  placeholder={t('settings.billing_config.clinic.address_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all resize-none"
                  value={activeEntity.address}
                  onChange={(e) => handleEntityChange('address', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.bank')}</label>
                <input
                  type="text"
                  placeholder={t('settings.billing_config.clinic.bank_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                  value={activeEntity.bank}
                  onChange={(e) => handleEntityChange('bank', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.iban')}</label>
                <input
                  type="text"
                  placeholder={t('settings.billing_config.clinic.iban_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all font-mono text-sm"
                  value={activeEntity.iban}
                  onChange={(e) => handleEntityChange('iban', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.email')}</label>
                <input
                  type="email"
                  placeholder={t('settings.billing_config.clinic.email_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                  value={activeEntity.email}
                  onChange={(e) => handleEntityChange('email', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.clinic.phone')}</label>
                <input
                  type="text"
                  placeholder={t('settings.billing_config.clinic.phone_placeholder')}
                  className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
                  value={activeEntity.phone}
                  onChange={(e) => handleEntityChange('phone', e.target.value)}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700">
            <p className="text-neutral-500">{t('settings.billing_config.legal_entities.no_entity_selected')}</p>
          </div>
        )}
      </div>

      {/* Section 2: Invoice Parameters */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl flex items-center justify-center text-secondary-600">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">{t('settings.billing_config.invoicing.title')}</h3>
            <p className="text-sm text-neutral-500">{t('settings.billing_config.invoicing.subtitle')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.invoicing.series_prefix')}</label>
            <input
              type="text"
              placeholder={t('settings.billing_config.invoicing.series_prefix_placeholder')}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all uppercase"
              value={formData.invoicing.seriesPrefix}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, invoicing: { ...prev.invoicing, seriesPrefix: e.target.value.toUpperCase() } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.invoicing.current_number')}</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.currentNumber}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, invoicing: { ...prev.invoicing, currentNumber: parseInt(e.target.value) || 0 } }))}
            />
            <p className="text-xs text-neutral-500 mt-1">{t('settings.billing_config.invoicing.current_number_hint')}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.invoicing.payment_term')}</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.defaultDueDays}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, invoicing: { ...prev.invoicing, defaultDueDays: parseInt(e.target.value) || 0 } }))}
            />
          </div>

           <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.invoicing.vat_rate')}</label>
            <input
              type="number"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.vatRate}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, invoicing: { ...prev.invoicing, vatRate: parseFloat(e.target.value) || 0 } }))}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.invoicing.footer_notes')}</label>
             <input
              type="text"
              placeholder={t('settings.billing_config.invoicing.footer_notes_placeholder')}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.invoicing.footerNotes}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, invoicing: { ...prev.invoicing, footerNotes: e.target.value } }))}
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
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">{t('settings.billing_config.email.title')}</h3>
            <p className="text-sm text-neutral-500">{t('settings.billing_config.email.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-4">
           <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.email.subject')}</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all"
              value={formData.emailTemplates?.subject}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, emailTemplates: { ...prev.emailTemplates, subject: e.target.value } }))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5 text-neutral-700 dark:text-neutral-300">{t('settings.billing_config.email.body')}</label>
            <textarea
              rows={6}
              className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all resize-none font-mono text-sm"
              value={formData.emailTemplates?.body}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, emailTemplates: { ...prev.emailTemplates, body: e.target.value } }))}
            />
            <p className="text-xs text-neutral-500 mt-2">
              {t('settings.billing_config.email.variables_hint')} <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{client_name}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{month}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{amount}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{due_date}`}</code>, <code className="bg-neutral-100 dark:bg-neutral-800 px-1 rounded">{`{clinic_name}`}</code>
            </p>
          </div>
        </div>
      </div>

      {/* Section 4: External Integrations */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center text-emerald-600">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white font-display">{t('settings.billing_config.integrations.title')}</h3>
            <p className="text-sm text-neutral-500">{t('settings.billing_config.integrations.subtitle')}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-2 mb-4">
              <img src="https://static.smartbill.ro/favicon.ico" className="w-4 h-4" alt="SmartBill" />
              <h4 className="font-bold text-neutral-900 dark:text-white text-sm">{t('settings.billing_config.integrations.smartbill_title')}</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">{t('settings.billing_config.integrations.smartbill_user')}</label>
                <input
                  type="email"
                  placeholder={t('settings.billing_config.integrations.smartbill_user_placeholder')}
                  className="w-full px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all text-sm"
                  value={formData.integrations?.smartbill?.user}
                  onChange={(e) => setFormData((prev: any) => ({
                    ...prev,
                    integrations: {
                      ...prev.integrations,
                      smartbill: { ...(prev.integrations?.smartbill || {}), user: e.target.value }
                    }
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5">{t('settings.billing_config.integrations.smartbill_token')}</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-primary-500 transition-all text-sm font-mono"
                    value={formData.integrations?.smartbill?.token}
                    onChange={(e) => setFormData((prev: any) => ({
                      ...prev,
                      integrations: {
                        ...prev.integrations,
                        smartbill: { ...(prev.integrations?.smartbill || {}), token: e.target.value }
                      }
                    }))}
                  />
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-neutral-500 mt-3 italic">
              {t('settings.billing_config.integrations.smartbill_note')}
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSaving ? t('settings.billing_config.saving') : t('settings.billing_config.save_button')}
        </button>
      </div>
    </div>
  );
}
