export default function DashboardLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-4 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg" />
      </div>

      {/* Toolbar skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="w-full sm:w-72 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
        <div className="w-32 h-11 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
      </div>

      {/* Content grid skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4" />
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-full" />
              <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-2/3" />
            </div>
            <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl mt-5" />
          </div>
        ))}
      </div>
    </div>
  );
}
