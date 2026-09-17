import { Skeleton } from "@/components/ui/skeleton";

export function LoadingState({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={className} role="status" aria-live="polite" aria-label="Loading">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function CardSkeleton({ className }: { className?: string }) {
  return <Skeleton className={className ?? "h-32 w-full rounded-lg"} />;
}
