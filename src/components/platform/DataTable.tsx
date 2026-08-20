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
  error,
  loading,
  onRowClick,
  getRowId,
}: {
  rows: T[];
  columns: Column<T>[];
  empty: string;
  /**
   * Set when the fetch FAILED, and shown instead of `empty`.
   *
   * Without this a failed request renders as an empty estate: four pages
   * caught the error into a toast, left `rows` empty, and let the table say
   * "No clinics registered." The health screen — whose entire job is telling
   * you something is broken — was the worst of them. "We could not ask" and
   * "we asked, and there is nothing" are different facts and must not share
   * a rendering.
   */
  error?: string | null;
  loading?: boolean;
  /**
   * Optional convenience: clicking anywhere in the row navigates. This is a
   * MOUSE-ONLY shortcut. `<tr>` cannot carry `role="button"` without
   * overriding the table's implicit row semantics for screen readers, so
   * keyboard and screen-reader access come from a real `<Link>`/`<a>` the
   * caller renders in the first meaningful cell's `render` — not from the
   * row itself. The row's click handler ignores clicks that land on that
   * anchor, so the anchor's own navigation does not also fire and push a
   * duplicate history entry.
   */
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
  // Ahead of the row check, not inside it: a partially-loaded list beside a
  // failure is still a failure, and reporting it is never less useful than
  // rendering rows we know to be incomplete.
  if (error) {
    return (
      <p className="py-16 text-center text-sm text-error-600 dark:text-error-400" role="alert">
        {error}
      </p>
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
                onClick={
                  onRowClick
                    ? (e) => {
                        // The caller's first cell renders a real anchor for this
                        // same navigation; when the click landed there, let its
                        // own handler do the work instead of also firing this
                        // one and pushing a duplicate history entry.
                        if ((e.target as HTMLElement).closest("a")) return;
                        onRowClick(row);
                      }
                    : undefined
                }
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
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
