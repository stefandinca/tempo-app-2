export default function ParentLoading() {
  return (
    <div className="flex-1 p-6 space-y-6 animate-pulse">
      {/* Title skeleton */}
      <div className="space-y-2">
        <div className="h-7 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-4 w-72 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-neutral-100 dark:bg-neutral-800 rounded w-1/2" />
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
