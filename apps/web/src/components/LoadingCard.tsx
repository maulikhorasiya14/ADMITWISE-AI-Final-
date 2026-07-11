export function LoadingCard({ title = "Loading" }: { title?: string }) {
  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="h-4 w-36 animate-pulse rounded bg-muted" aria-hidden="true" />
      <h2 className="mt-4 text-lg font-semibold">{title}</h2>
      <div className="mt-4 space-y-3" aria-hidden="true">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
