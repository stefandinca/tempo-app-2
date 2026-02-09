"use client";

import { useState } from "react";
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  Loader2, 
  AlertCircle,
  Calendar,
  Tag,
  DollarSign
} from "lucide-react";
import { db } from "@/lib/firebase";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDocs,
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
  const [editingExpense, setEditingEvent] = useState<any>(null);

  const CATEGORIES: { id: ExpenseCategory; label: string; color: string }[] = [
    { id: 'rent', label: t('expense_manager.categories.rent'), color: 'bg-blue-100 text-blue-700' },
    { id: 'taxes', label: t('expense_manager.categories.taxes'), color: 'bg-purple-100 text-purple-700' },
    { id: 'utilities', label: t('expense_manager.categories.utilities'), color: 'bg-amber-100 text-amber-700' },
    { id: 'supplies', label: t('expense_manager.categories.supplies'), color: 'bg-emerald-100 text-emerald-700' },
    { id: 'marketing', label: t('expense_manager.categories.marketing'), color: 'bg-pink-100 text-pink-700' },
    { id: 'other', label: t('expense_manager.categories.other'), color: 'bg-neutral-100 text-neutral-700' },
  ];

  // Form State
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
    setEditingEvent(null);
    setFormData({
      title: "",
      amount: "",
      category: "other",
      date: `${year}-${String(month + 1).padStart(2, '0')}-01`,
      isRecurring: false,
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (expense: any) => {
    setEditingEvent(expense);
    setFormData({
      title: expense.title,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date,
      isRecurring: expense.isRecurring || false,
      notes: expense.notes || ""
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
        try {
          await deleteDoc(doc(db, "expenses", id));
          success(t('expense_manager.messages.delete_success'));
        } catch (err) {
          error(t('expense_manager.messages.delete_error'));
        }
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingExpense) {
        await updateDoc(doc(db, "expenses", editingExpense.id), payload);
        success(t('expense_manager.messages.save_success_edit'));
      } else {
        await addDoc(collection(db, "expenses"), {
          ...payload,
          createdAt: new Date().toISOString()
        });
        
        // If it's a new recurring expense, we might want to save it to recurring_expenses too
        if (formData.isRecurring) {
          const exists = recurringConfigs.find(r => r.title === formData.title);
          if (!exists) {
            await addDoc(collection(db, "recurring_expenses"), {
              title: formData.title,
              amount: parseFloat(formData.amount),
              category: formData.category,
              frequency: 'monthly',
              active: true,
              startDate: formData.date
            });
          }
        }
        
        success(t('expense_manager.messages.save_success_add'));
      }
      setIsModalOpen(false);
    } catch (err) {
      error(t('expense_manager.messages.save_error'));
    }
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
            
            // Check if already exists for this month
            const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
            const exists = expenses.find(e => e.title === config.title && e.date.startsWith(monthStr));
            
            if (!exists) {
              const ref = doc(collection(db, "expenses"));
              batch.set(ref, {
                title: config.title,
                amount: config.amount,
                category: config.category,
                date: `${monthStr}-01`,
                isRecurring: true,
                recurringId: config.id,
                createdAt: new Date().toISOString()
              });
              count++;
            }
          }

          await batch.commit();
          success(t('expense_manager.messages.sync_success', { count }));
        } catch (err) {
          error(t('expense_manager.messages.sync_error'));
        } finally {
          setIsSyncing(false);
        }
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder={t('expense_manager.search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleSyncRecurring}
            disabled={isSyncing}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700 rounded-xl transition-colors"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            {t('expense_manager.sync_recurring')}
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-primary-600/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            {t('expense_manager.add_expense')}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50">
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('expense_manager.table.date')}</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('expense_manager.table.title')}</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider">{t('expense_manager.table.category')}</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">{t('expense_manager.table.amount')}</th>
              <th className="px-6 py-4 text-xs font-bold text-neutral-500 uppercase tracking-wider text-right">{t('expense_manager.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary-500" />
                </td>
              </tr>
            ) : filteredExpenses.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-neutral-500">
                  {t('expense_manager.table.no_expenses')}
                </td>
              </tr>
            ) : (
              filteredExpenses.map((expense) => {
                const category = CATEGORIES.find(c => c.id === expense.category);
                return (
                  <tr key={expense.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors group">
                    <td className="px-6 py-4 text-sm text-neutral-600 dark:text-neutral-400">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900 dark:text-white">{expense.title}</span>
                        {expense.isRecurring && (
                          <span title={t('expense_manager.table.recurring')}>
                            <RotateCcw className="w-3 h-3 text-neutral-400" />
                          </span>
                        )}
                      </div>
                      {expense.notes && <p className="text-xs text-neutral-400 mt-0.5">{expense.notes}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx("px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider", category?.color)}>
                        {category?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-bold text-neutral-900 dark:text-white">
                      {expense.amount.toFixed(2)} RON
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEdit(expense)}
                          className="p-1.5 text-neutral-400 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(expense.id)}
                          className="p-1.5 text-neutral-400 hover:text-error-500 hover:bg-error-50 dark:hover:bg-error-900/20 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 flex items-center justify-between">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {editingExpense ? t('expense_manager.edit_expense') : t('expense_manager.add_expense')}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">{t('expense_manager.form.title')}</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                    placeholder={t('expense_manager.form.title_placeholder')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">{t('expense_manager.form.amount')}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">{t('expense_manager.form.date')}</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={e => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">{t('expense_manager.form.category')}</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                      className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{t('expense_manager.form.is_recurring')}</span>
                  </label>
                  <p className="text-[10px] text-neutral-400 mt-1 ml-6">{t('expense_manager.form.recurring_help')}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1">{t('expense_manager.form.notes')}</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none"
                    rows={2}
                    placeholder={t('expense_manager.form.notes_placeholder')}
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 font-bold rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all"
                >
                  {t('expense_manager.form.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}