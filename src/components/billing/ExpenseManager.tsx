"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  Loader2, 
  Calendar,
  Tag,
  DollarSign,
  MoreVertical,
  ChevronDown,
  X
} from "lucide-react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch
} from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { clsx } from "clsx";
import { useRecurringExpenses } from "@/hooks/useCollections";
import { ExpenseCategory } from "@/types/billing";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";

interface ExpenseManagerProps {
  expenses: any[];
  loading: boolean;
  year: number;
  month: number;
}

export default function ExpenseManager({ expenses, loading, year, month }: ExpenseManagerProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const { data: recurringConfigs } = useRecurringExpenses();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);

  const CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
    { id: 'rent', label: t('expense_manager.categories.rent'), color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    { id: 'taxes', label: t('expense_manager.categories.taxes'), color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
    { id: 'utilities', label: t('expense_manager.categories.utilities'), color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
    { id: 'supplies', label: t('expense_manager.categories.supplies'), color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
    { id: 'marketing', label: t('expense_manager.categories.marketing'), color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
    { id: 'other', label: t('expense_manager.categories.other'), color: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-400' },
  ];

  const [formData, setFormData] = useState({
    title: "",
    amount: "",
    category: "other" as ExpenseCategory,
    date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
    isRecurring: false,
    notes: ""
  });

  const filteredExpenses = expenses.filter(e => 
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormData({
      title: "", amount: "", category: "other",
      date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      isRecurring: false, notes: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title, amount: expense.amount.toString(), category: expense.category,
      date: expense.date, isRecurring: expense.isRecurring || false, notes: expense.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    customConfirm({
      title: t('common.delete'),
      message: t('expense_manager.messages.delete_confirm'),
      confirmLabel: t('common.delete'),
      variant: 'danger',
      onConfirm: async () => {
        try { await deleteDoc(doc(db, "expenses", id)); success(t('expense_manager.messages.delete_success')); } 
        catch (err) { error(t('expense_manager.messages.delete_error')); }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      year,
      month,
      updatedAt: new Date().toISOString()
    };
    try {
      if (editingExpense) { await updateDoc(doc(db, "expenses", editingExpense.id), payload); success(t('expense_manager.messages.save_success_edit')); } 
      else {
        await addDoc(collection(db, "expenses"), { ...payload, createdAt: new Date().toISOString() });
        if (formData.isRecurring) {
          const exists = recurringConfigs.find(r => r.title === formData.title);
          if (!exists) { await addDoc(collection(db, "recurring_expenses"), { title: formData.title, amount: parseFloat(formData.amount), category: formData.category, frequency: 'monthly', active: true, startDate: formData.date }); }
        }
        success(t('expense_manager.messages.save_success_add'));
      }
      setIsModalOpen(false);
    } catch (err) { error(t('expense_manager.messages.save_error')); }
  };

  const handleSyncRecurring = async () => {
    customConfirm({
      title: t('expense_manager.sync_recurring'),
      message: t('expense_manager.messages.sync_confirm'),
      confirmLabel: t('common.confirm'),
      variant: 'primary',
      onConfirm: async () => {
        setIsSyncing(true);
        try {
          const batch = writeBatch(db);
          let count = 0;
          for (const config of recurringConfigs) {
            if (!config.active) continue;
            const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            const exists = expenses.find(e => e.title === config.title && e.date.startsWith(monthStr));
            if (!exists) {
              const ref = doc(collection(db, "expenses"));
              batch.set(ref, { title: config.title, amount: config.amount, category: config.category, date: `${monthStr}-01`, isRecurring: true, recurringId: config.id, year, month, createdAt: new Date().toISOString() });
              count++;
            }
          }
          await batch.commit();
          success(t('expense_manager.messages.sync_success', { count }));
        } catch (err) { error(t('expense_manager.messages.sync_error')); } 
        finally { setIsSyncing(false); }
      }
    });
  };

  if (loading) return <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder={t('expense_manager.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={handleSyncRecurring} disabled={isSyncing} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 rounded-xl transition-colors">{isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}{t('expense_manager.sync_recurring')}</button>
          <button onClick={handleOpenAdd} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-600/20 transition-all"><Plus className="w-4 h-4" />{t('expense_manager.add_expense')}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredExpenses.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800">
            <DollarSign className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
            <p className="text-neutral-500 font-medium">{t('expense_manager.table.no_expenses')}</p>
          </div>
        ) : (
          filteredExpenses.map((expense) => {
            const category = CATEGORIES.find(c => c.id === expense.category);
            return (
              <div key={expense.id} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-neutral-900 dark:text-white truncate">{expense.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={clsx("px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider", category?.color)}>{category?.label}</span>
                      {expense.isRecurring && (
                        <span title={t('expense_manager.table.recurring')}>
                          <RotateCcw className="w-3 h-3 text-neutral-400" />
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEdit(expense)} className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(expense.id)} className="p-2 text-neutral-400 hover:text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-xl transition-colors"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {expense.notes && <p className="text-xs text-neutral-500 mb-4 italic">&quot;{expense.notes}&quot;</p>}

                <div className="flex items-end justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{new Date(expense.date).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">{t('expense_manager.table.amount')}</p>
                    <p className="text-lg font-bold text-neutral-900 dark:text-white leading-none mt-1">{expense.amount.toFixed(2)} <span className="text-xs font-normal text-neutral-400">RON</span></p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal - Reusing your existing modal logic but making sure it looks good */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{editingExpense ? t('expense_manager.edit_expense') : t('expense_manager.add_expense')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-neutral-400"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="space-y-4">
                <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">{t('expense_manager.form.title')}</label><input type="text" required value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all" placeholder={t('expense_manager.form.title_placeholder')} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">{t('expense_manager.form.amount')}</label><input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all" placeholder="0.00" /></div>
                  <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">{t('expense_manager.form.date')}</label><input type="date" required value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all" /></div>
                </div>
                <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">{t('expense_manager.form.category')}</label><select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })} className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all">{CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.label}</option>))}</select></div>
                <div className="p-3 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl border border-neutral-100 dark:border-neutral-800">
                  <label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={formData.isRecurring} onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })} className="w-5 h-5 rounded-lg border-neutral-300 text-primary-600 focus:ring-primary-500 transition-all" /><div className="flex-1"><p className="text-sm font-bold text-neutral-700 dark:text-neutral-200">{t('expense_manager.form.is_recurring')}</p><p className="text-[10px] text-neutral-400">{t('expense_manager.form.recurring_help')}</p></div></label>
                </div>
                <div><label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">{t('expense_manager.form.notes')}</label><textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm transition-all resize-none" rows={2} placeholder={t('expense_manager.form.notes_placeholder')} /></div>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 text-sm font-bold text-neutral-500 hover:text-neutral-700 transition-colors">{t('common.cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all">{t('expense_manager.form.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
