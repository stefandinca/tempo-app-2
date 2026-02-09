"use client";

import { useState } from "react";
import { Users, Loader2, AlertCircle, Edit, Check, X, DollarSign, CheckCircle } from "lucide-react";
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

      // Construct distinct ID for this payout
      const payoutId = `payout_${year}_${String(month + 1).padStart(2, '0')}_${payout.teamMemberId}`;
      const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

      const payload = {
        teamMemberId: payout.teamMemberId,
        teamMemberName: payout.teamMemberName, // Snapshot name
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
      error("Failed to save payout");
    } finally {
      setIsSaving(false);
    }
  };

  // Quick mark as paid without editing values (uses current values)
  const handleMarkAsPaid = async (payout: TeamPayout) => {
    customConfirm({
      title: "Record Payment",
      message: t('billing_page.payout_messages.confirm_pay', { amount: formatCurrency(payout.total), name: payout.teamMemberName }),
      confirmLabel: "Record Payment",
      variant: 'primary',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          const payoutId = `payout_${year}_${String(month + 1).padStart(2, '0')}_${payout.teamMemberId}`;
          const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

          await setDoc(doc(db, "payouts", payoutId), {
            teamMemberId: payout.teamMemberId,
            teamMemberName: payout.teamMemberName,
            month: monthStr,
            baseAmount: payout.baseSalary,
            bonusAmount: payout.bonus,
            deductions: payout.deductions,
            total: payout.total,
            status: "paid",
            paidAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });

          success(t('billing_page.payout_messages.pay_complete'));
        } catch (err) {
          console.error(err);
          error("Failed to mark as paid");
        } finally {
          setIsSaving(false);
        }
      }
    });
  };

  const totalPayout = payouts.reduce((sum, p) => sum + p.total, 0);

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (payouts.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center">
        <Users className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
          {t('billing_page.no_team_members')}
        </h3>
        <p className="text-neutral-500">
          {t('billing_page.no_team_description')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-3">{t('billing_page.table.team_member')}</th>
                <th className="px-6 py-3 text-center">{t('billing_page.table.activity')}</th>
                <th className="px-6 py-3 text-right">{t('billing_page.table.base_salary')}</th>
                <th className="px-6 py-3 text-right w-32">{t('billing_page.table.bonus')}</th>
                <th className="px-6 py-3 text-right w-32">{t('billing_page.table.deductions')}</th>
                <th className="px-6 py-3 text-right">{t('billing_page.table.total_payout')}</th>
                <th className="px-6 py-3 text-center">{t('billing_page.table.status')}</th>
                <th className="px-6 py-3 text-right">{t('billing_page.table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {payouts.map((payout) => {
                const isEditing = editingId === payout.teamMemberId;
                const isPaid = payout.status === "paid";

                return (
                  <tr
                    key={payout.teamMemberId}
                    className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <Link 
                        href="/team/"
                        className="font-medium text-neutral-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        {payout.teamMemberName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-neutral-700 dark:text-neutral-300">
                        {payout.totalHours}h
                      </div>
                      <div className="text-xs text-neutral-400">
                        {payout.sessions} {t('evaluations.items')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-neutral-700 dark:text-neutral-300">
                      {formatCurrency(payout.baseSalary)}
                    </td>
                    
                    {/* Editable Bonus */}
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <input 
                          type="number"
                          className="w-24 px-2 py-1 bg-white dark:bg-neutral-900 border border-primary-500 rounded-lg text-right text-sm focus:outline-none"
                          value={editValues.bonus}
                          onChange={e => setEditValues({...editValues, bonus: e.target.value})}
                          placeholder="0"
                          autoFocus
                        />
                      ) : (
                        <span className="text-success-600">
                          {payout.bonus > 0 ? `+${formatCurrency(payout.bonus)}` : "—"}
                        </span>
                      )}
                    </td>

                    {/* Editable Deductions */}
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <input 
                          type="number"
                          className="w-24 px-2 py-1 bg-white dark:bg-neutral-900 border border-primary-500 rounded-lg text-right text-sm focus:outline-none"
                          value={editValues.deductions}
                          onChange={e => setEditValues({...editValues, deductions: e.target.value})}
                          placeholder="0"
                        />
                      ) : (
                        <span className="text-error-600">
                          {payout.deductions > 0 ? `-${formatCurrency(payout.deductions)}` : "—"}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <span
                        className={clsx(
                          "font-bold",
                          payout.total > 0
                            ? "text-neutral-900 dark:text-white"
                            : "text-neutral-400"
                        )}
                      >
                        {formatCurrency(payout.total)} RON
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center">
                      <span className={clsx(
                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold",
                        isPaid 
                          ? "bg-success-100 text-success-700 dark:bg-success-900/30 dark:text-success-400" 
                          : "bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-400"
                      )}>
                        {isPaid ? t('billing_page.status.paid') : t('billing_page.status.pending')}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => handleSave(payout)}
                              disabled={isSaving}
                              className="p-1.5 bg-success-100 text-success-700 rounded-lg hover:bg-success-200 transition-colors"
                              title={t('common.save')}
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={isSaving}
                              className="p-1.5 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors"
                              title={t('common.cancel')}
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            {!isPaid && (
                              <button
                                onClick={() => handleEdit(payout)}
                                className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-colors"
                                title={t('common.edit')}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleMarkAsPaid(payout)}
                              disabled={isPaid || isSaving}
                              className={clsx(
                                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                                isPaid 
                                  ? "bg-neutral-100 text-neutral-400 cursor-not-allowed" 
                                  : "bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
                              )}
                            >
                              {isPaid ? (
                                <><CheckCircle className="w-3.5 h-3.5" /> {t('billing_page.status.paid')}</>
                              ) : (
                                <><DollarSign className="w-3.5 h-3.5" /> {t('common.save')}</>
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-neutral-50 dark:bg-neutral-800/50 font-medium">
              <tr>
                <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300">
                  {t('billing_page.table.monthly_total')}
                </td>
                <td colSpan={4}></td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(totalPayout)} RON
                  </span>
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}