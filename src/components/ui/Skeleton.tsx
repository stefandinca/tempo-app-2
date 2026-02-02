"use client";

import { clsx } from "clsx";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={clsx(
        "animate-pulse bg-neutral-200 dark:bg-neutral-700 rounded",
        className
      )}
    />
  );
}

// Pre-built skeleton components for common patterns

export function ClientCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col h-full">
      {/* Top Section */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div>
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      <div className="space-y-4 flex-1">
        {/* Therapist */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="w-5 h-5 rounded-full" />
          <Skeleton className="h-4 w-28" />
        </div>

        {/* Phone */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>

        {/* Next Session */}
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-4 w-36" />
        </div>

        {/* Progress */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
        <Skeleton className="flex-1 h-10 rounded-xl" />
        <Skeleton className="flex-1 h-10 rounded-xl" />
      </div>
    </div>
  );
}

export function ServiceCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div>
            <Skeleton className="h-5 w-36 mb-2" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-8" />
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

export function TeamMemberCardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton className="w-14 h-14 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-3 w-40" />
        </div>
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-6 w-12" />
        </div>
        <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-3">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-6 w-12" />
        </div>
      </div>

      <Skeleton className="h-10 w-full rounded-xl" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-neutral-100 dark:border-neutral-800">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function KPICardSkeleton() {
  return (
    <div className="bg-white dark:bg-neutral-900 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="w-9 h-9 rounded-lg" />
      </div>
      <Skeleton className="h-9 w-32 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function CalendarEventSkeleton() {
  return (
    <div className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800">
      <Skeleton className="h-3 w-16 mb-1" />
      <Skeleton className="h-4 w-24 mb-1" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
