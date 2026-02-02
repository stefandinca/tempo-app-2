"use client";

import { useState } from "react";
import { Users, Loader2, AlertCircle, Edit, Check, X, DollarSign, CheckCircle } from "lucide-react";
import { TeamPayout } from "@/lib/billing";
import { clsx } from "clsx";
import { db } from "@/lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/context/ToastContext";

interface TeamPayoutsTableProps {
  payouts: TeamPayout[];
  loading?: boolean;
  year: number;
  month: number;
}

export default function TeamPayoutsTable({ payouts, loading, year, month }: TeamPayoutsTableProps) {
  const { success, error } = useToast();
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
      
      success(markAsPaid ? "Payment recorded successfully" : "Payout updated");
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
    if (confirm(`Confirm payment of ${formatCurrency(payout.total)} RON to ${payout.teamMemberName}?`)) {
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

        success("Payment marked as complete");
      } catch (err) {
        console.error(err);
        error("Failed to mark as paid");
      } finally {
        setIsSaving(false);
      }
    }
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
          No team members found
        </h3>
        <p className="text-neutral-500">
          Add team members in the Team section to calculate payouts.
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
                <th className="px-6 py-3">Team Member</th>
                <th className="px-6 py-3 text-center">Activity</th>
                <th className="px-6 py-3 text-right">Base Salary</th>
                <th className="px-6 py-3 text-right w-32">Bonus</th>
                <th className="px-6 py-3 text-right w-32">Deductions</th>
                <th className="px-6 py-3 text-right">Total Payout</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
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
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {payout.teamMemberName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="text-neutral-700 dark:text-neutral-300">
                        {payout.totalHours}h
                      </div>
                      <div className="text-xs text-neutral-400">
                        {payout.sessions} sessions
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
                        {isPaid ? "Paid" : "Pending"}
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
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={handleCancel}
                              disabled={isSaving}
                              className="p-1.5 bg-neutral-100 text-neutral-600 rounded-lg hover:bg-neutral-200 transition-colors"
                              title="Cancel"
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
                                title="Edit Adjustments"
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
                                <><CheckCircle className="w-3 h-3" /> Paid</>
                              ) : (
                                <><DollarSign className="w-3 h-3" /> Pay</>
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
                  Monthly Total
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