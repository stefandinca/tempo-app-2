"use client";

import { useState, useMemo } from "react";
import { Users, Loader2, Edit, Check, X, DollarSign, CheckCircle, Search, TrendingUp, TrendingDown, BookOpen } from "lucide-react";
import Link from "next/link";
import { TeamPayout } from "@/lib/billing";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";
import { useTranslation } from "react-i18next";
import { useConfirm } from "@/context/ConfirmContext";

interface TeamPayoutsTableProps {
  payouts: TeamPayout[];
  loading?: boolean;
  year: number;
  month: number;
}

export default function TeamPayoutsTable({ payouts, loading, year, month }: TeamPayoutsTableProps) {
  const { t } = useTranslation();
  const { success, error } = useToast();
  const { confirm: customConfirm } = useConfirm();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ bonus: string; deductions: string }>({ bonus: "", deductions: "" });
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPayouts = useMemo(() => 
    payouts.filter(p => p.teamMemberName.toLowerCase().includes(searchQuery.toLowerCase())),
  [payouts, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const handleEdit = (payout: TeamPayout) => {
    setEditingId(payout.teamMemberId);
    setEditValues({
      bonus: payout.bonus.toString(),
      deductions: payout.deductions.toString()
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValues({ bonus: "", deductions: "" });
  };

  const handleSave = async (payout: TeamPayout, markAsPaid = false) => {
    setIsSaving(true);
    try {
      const bonus = parseFloat(editValues.bonus) || 0;
      const deductions = parseFloat(editValues.deductions) || 0;
      const total = payout.baseSalary + bonus - deductions;

      const payoutId = `payout_${year}_${String(month + 1).padStart(2, '0')}_${payout.teamMemberId}`;
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const payload = {
        teamMemberId: payout.teamMemberId,
        teamMemberName: payout.teamMemberName,
        month: monthStr,
        baseAmount: payout.baseSalary,
        bonusAmount: bonus,
        deductions: deductions,
        total: total,
        status: markAsPaid ? "paid" : "pending",
        paidAt: markAsPaid ? serverTimestamp() : null,
        updatedAt: serverTimestamp()
      };

      await setDoc(doc(db, "payouts", payoutId), payload, { merge: true });
      success(markAsPaid ? t('billing_page.payout_messages.pay_success') : t('billing_page.payout_messages.save_success'));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      error(t('common.error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkAsPaid = async (payout: TeamPayout) => {
    customConfirm({
      title: t('billing_page.mark_as_paid'),
      message: t('billing_page.payout_messages.confirm_pay', { amount: formatCurrency(payout.total), name: payout.teamMemberName }),
      confirmLabel: t('billing_page.mark_as_paid'),
      variant: 'primary',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const payoutId = `payout_${year}_${String(month + 1).padStart(2, '0')}_${payout.teamMemberId}`;
          const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;
          await setDoc(doc(db, "payouts", payoutId), {
            teamMemberId: payout.teamMemberId, teamMemberName: payout.teamMemberName, month: monthStr,
            baseAmount: payout.baseSalary, bonusAmount: payout.bonus, deductions: payout.deductions,
            total: payout.total, status: "paid", paidAt: serverTimestamp(), updatedAt: serverTimestamp()
          }, { merge: true });
          success(t('billing_page.payout_messages.pay_complete'));
        } catch (err) { console.error(err); error(t('common.error')); } finally { setIsSaving(false); }
      }
    });
  };

  if (loading) {
    return <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (payouts.length === 0) {
    return <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center"><Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" /><h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">{t('billing_page.no_team_members')}</h3><p className="text-neutral-500">{t('billing_page.no_team_description')}</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder={t('billing_page.search_team')}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl focus:ring-2 focus:ring-primary-500 outline-none transition-all shadow-sm"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredPayouts.map((payout) => {
          const isEditing = editingId === payout.teamMemberId;
          const isPaid = payout.status === "paid";
          return (
            <div key={payout.teamMemberId} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <Link href="/team/" className="font-bold text-neutral-900 dark:text-white hover:text-primary-600 transition-colors truncate block">{payout.teamMemberName}</Link>
                  <div className="flex items-center gap-2 mt-1 text-xs text-neutral-500">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{payout.totalHours}h • {payout.sessions} {t('billing_page.table.sessions').toLowerCase()}</span>
                  </div>
                </div>
                <span className={clsx("px-2 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0", isPaid ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400" : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400")}>
                  {isPaid ? t('billing_page.status.paid') : t('billing_page.status.pending')}
                </span>
              </div>

              <div className="space-y-2 py-3 border-y border-neutral-50 dark:border-neutral-800/50">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500">{t('billing_page.table.base_salary')}</span>
                  <span className="font-medium text-neutral-900 dark:text-white">{formatCurrency(payout.baseSalary)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500">{t('billing_page.table.bonus')}</span>
                  {isEditing ? (
                    <input type="number" className="w-20 px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800 border border-primary-500 rounded text-right text-sm outline-none" value={editValues.bonus} onChange={e => setEditValues({...editValues, bonus: e.target.value})} />
                  ) : (
                    <span className="text-success-600 font-medium">{payout.bonus > 0 ? `+${formatCurrency(payout.bonus)}` : "—"}</span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-500">{t('billing_page.table.deductions')}</span>
                  {isEditing ? (
                    <input type="number" className="w-20 px-2 py-0.5 bg-neutral-50 dark:bg-neutral-800 border border-primary-500 rounded text-right text-sm outline-none" value={editValues.deductions} onChange={e => setEditValues({...editValues, deductions: e.target.value})} />
                  ) : (
                    <span className="text-error-600 font-medium">{payout.deductions > 0 ? `-${formatCurrency(payout.deductions)}` : "—"}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-4">
                <div>
                  <p className="text-[10px] text-neutral-400 uppercase font-bold tracking-wider">{t('billing_page.table.total_payout')}</p>
                  <p className="text-lg font-bold text-neutral-900 dark:text-white leading-none mt-1">{formatCurrency(payout.total)} <span className="text-xs font-normal text-neutral-400">RON</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button onClick={() => handleSave(payout)} disabled={isSaving} className="p-2 bg-success-100 text-success-700 rounded-xl hover:bg-success-200 transition-colors"><Check className="w-4 h-4" /></button>
                      <button onClick={handleCancel} disabled={isSaving} className="p-2 bg-neutral-100 text-neutral-600 rounded-xl hover:bg-neutral-200 transition-colors"><X className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      {!isPaid && <button onClick={() => handleEdit(payout)} className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"><Edit className="w-4 h-4" /></button>}
                      <button onClick={() => handleMarkAsPaid(payout)} disabled={isPaid || isSaving} className={clsx("px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2", isPaid ? "bg-neutral-50 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed" : "bg-primary-600 text-white hover:bg-primary-700 hover:shadow-primary-500/20")}>
                        {isPaid ? <><CheckCircle className="w-3.5 h-3.5" /> {t('billing_page.status.paid')}</> : <><DollarSign className="w-3.5 h-3.5" /> {t('common.save')}</>}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
