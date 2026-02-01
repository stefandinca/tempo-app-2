"use client";

import { Users, Loader2, AlertCircle } from "lucide-react";
import { TeamPayout } from "@/lib/billing";
import { clsx } from "clsx";

interface TeamPayoutsTableProps {
  payouts: TeamPayout[];
  loading?: boolean;
}

export default function TeamPayoutsTable({ payouts, loading }: TeamPayoutsTableProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ro-RO", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const totalPayout = payouts.reduce((sum, p) => sum + p.calculatedPayout, 0);
  const totalHours = payouts.reduce((sum, p) => sum + p.totalHours, 0);
  const totalSessions = payouts.reduce((sum, p) => sum + p.sessions, 0);

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
          No sessions recorded
        </h3>
        <p className="text-neutral-500">
          There are no sessions to calculate payouts for this period.
        </p>
      </div>
    );
  }

  const hasMissingRates = payouts.some(p => p.hourlyRate === 0);

  return (
    <div className="space-y-4">
      {hasMissingRates && (
        <div className="flex items-start gap-3 p-4 bg-warning-50 dark:bg-warning-900/20 border border-warning-200 dark:border-warning-800 rounded-xl">
          <AlertCircle className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning-800 dark:text-warning-200">
              Missing hourly rates
            </p>
            <p className="text-xs text-warning-600 dark:text-warning-400 mt-0.5">
              Some team members don&apos;t have hourly rates set. Update their profiles in the Team section.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 dark:bg-neutral-800/50 text-neutral-500 font-medium">
              <tr>
                <th className="px-6 py-3">Team Member</th>
                <th className="px-6 py-3 text-center">Sessions</th>
                <th className="px-6 py-3 text-center">Hours</th>
                <th className="px-6 py-3 text-right">Rate/Hour</th>
                <th className="px-6 py-3 text-right">Payout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {payouts.map((payout) => (
                <tr
                  key={payout.odId}
                  className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="font-medium text-neutral-900 dark:text-white">
                      {payout.odName}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">
                    {payout.sessions}
                  </td>
                  <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">
                    {payout.totalHours}h
                  </td>
                  <td className="px-6 py-4 text-right">
                    {payout.hourlyRate > 0 ? (
                      <span className="text-neutral-700 dark:text-neutral-300">
                        {formatCurrency(payout.hourlyRate)} RON
                      </span>
                    ) : (
                      <span className="text-warning-600 text-xs font-medium">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span
                      className={clsx(
                        "font-bold",
                        payout.calculatedPayout > 0
                          ? "text-neutral-900 dark:text-white"
                          : "text-neutral-400"
                      )}
                    >
                      {formatCurrency(payout.calculatedPayout)} RON
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-neutral-50 dark:bg-neutral-800/50 font-medium">
              <tr>
                <td className="px-6 py-4 text-neutral-700 dark:text-neutral-300">
                  Total
                </td>
                <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">
                  {totalSessions}
                </td>
                <td className="px-6 py-4 text-center text-neutral-700 dark:text-neutral-300">
                  {Math.round(totalHours * 10) / 10}h
                </td>
                <td className="px-6 py-4"></td>
                <td className="px-6 py-4 text-right">
                  <span className="font-bold text-neutral-900 dark:text-white">
                    {formatCurrency(totalPayout)} RON
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
