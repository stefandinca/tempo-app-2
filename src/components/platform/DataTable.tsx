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
export default function DataTable<T extends { id?: string }>({
  rows,
  columns,
  empty,
  loading,
  onRowClick,
}: {
  rows: T[];
  columns: Column<T>[];
  empty: string;
  loading?: boolean;
  onRowClick?: (row: T) => void;
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
          {rows.map((row, i) => (
            <tr
              key={row.id ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                "border-b last:border-0 border-neutral-100 dark:border-neutral-800/60",
                onRowClick && "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/40",
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
