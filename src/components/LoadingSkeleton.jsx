export function CardSkeleton() {
  return (
    <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
      <div className="flex items-center justify-between mb-3">
        <div className="h-4 w-32 rounded-lg animate-shimmer"></div>
        <div className="h-6 w-14 rounded-lg animate-shimmer"></div>
      </div>
      <div className="h-3 w-48 rounded animate-shimmer"></div>
    </div>
  );
}

export function EventCardSkeleton() {
  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-200">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-full animate-shimmer flex-shrink-0"></div>
        <div className="flex-1 space-y-3">
          <div className="h-5 w-48 rounded-lg animate-shimmer"></div>
          <div className="h-3 w-full rounded animate-shimmer"></div>
          <div className="h-3 w-3/4 rounded animate-shimmer"></div>
          <div className="flex gap-4 mt-3">
            <div className="h-3 w-28 rounded animate-shimmer"></div>
            <div className="h-3 w-28 rounded animate-shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MapSidebarSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(5)].map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
