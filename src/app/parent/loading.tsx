export default function ParentLoading() {
  return (
    <div className="flex-1 p-4 space-y-5 animate-pulse">
      {/* Greeting skeleton */}
      <div className="pt-5 space-y-2">
        <div className="h-6 w-48 bg-neutral-200 dark:bg-neutral-800 rounded-lg" />
        <div className="h-4 w-36 bg-neutral-100 dark:bg-neutral-800/60 rounded-lg" />
      </div>

      {/* Hero card skeleton */}
      <div className="h-44 bg-primary-100 dark:bg-primary-900/20 rounded-2xl" />

      {/* Status rings row */}
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 min-w-[130px] flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-full border-4 border-neutral-100 dark:border-neutral-800" />
            <div className="h-3 w-16 bg-neutral-100 dark:bg-neutral-800 rounded mt-2" />
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 flex flex-col items-center gap-1.5"
          >
            <div className="w-10 h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl" />
            <div className="h-2 w-12 bg-neutral-100 dark:bg-neutral-800 rounded" />
          </div>
        ))}
      </div>

      {/* Activity timeline */}
      <div className="space-y-2">
        <div className="h-3 w-24 bg-neutral-200 dark:bg-neutral-800 rounded" />
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-8 h-8 bg-neutral-100 dark:bg-neutral-800 rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-neutral-100 dark:bg-neutral-800 rounded w-3/4" />
                <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
