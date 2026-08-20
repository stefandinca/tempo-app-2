"use client";

import { clsx } from "clsx";
import { Loader2 } from "lucide-react";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right";
}

/**
 * The console's one table. Scrolls horizontally inside its own container so a
 * wide row never makes the page scroll sideways on a phone.
 */
export default function DataTable<T>({
  rows,
  columns,
  empty,
  loading,
  onRowClick,
  getRowId,
}: {
  rows: T[];
  columns: Column<T>[];
  empty: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
  /**
   * A row's identity is the caller's business, not the table's — requiring an
   * `id` field on every `T` forced callers to reshape their data purely to be
   * tabular (`ClinicSpend` and `ClinicHealth` key on `tenantId`, not `id`).
   * Without this, the React key falls back to the row's index, which is fine
   * only as long as the list is never reordered client-side.
   */
  getRowId?: (row: T, index: number) => string;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }
  if (!rows.length) {
    return <p className="py-16 text-center text-sm text-neutral-500">{empty}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-200 dark:border-neutral-800">
            {columns.map((c) => (
              <th
                key={c.key}
                className={clsx(
                  "px-4 py-3 text-xs font-semibold uppercase tracking-wide text-neutral-500 whitespace-nowrap",
                  c.align === "right" ? "text-right" : "text-left",
                )}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => {
            const key = getRowId ? getRowId(row, i) : String(i);
            return (
              <tr
                key={key}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.key === "Enter") {
                          onRowClick(row);
                        } else if (e.key === " ") {
                          e.preventDefault();
                          onRowClick(row);
                        }
                      }
                    : undefined
                }
                tabIndex={onRowClick ? 0 : undefined}
                role={onRowClick ? "button" : undefined}
                className={clsx(
                  "border-b last:border-0 border-neutral-100 dark:border-neutral-800/60",
                  onRowClick &&
                    "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-inset",
                )}
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={clsx(
                      "px-4 py-3 text-neutral-800 dark:text-neutral-200",
                      c.align === "right" ? "text-right" : "text-left",
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
