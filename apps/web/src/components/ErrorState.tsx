type ErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
};

export function ErrorState({ title, message, onRetry }: ErrorStateProps) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-card p-8 text-center shadow-sm">
      <h2 className="text-xl font-semibold text-destructive">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-5 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
          Try again
        </button>
      ) : null}
    </div>
  );
}
