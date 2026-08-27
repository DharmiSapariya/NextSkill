import { Loader2 } from "lucide-react";

export function LoadingState({ label = "Loading…" }) {
  return (
    <div className="flex items-center gap-3 py-10 font-sans text-sm text-charcoal/50">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message = "Something went wrong.", onRetry }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-danger/20 bg-danger/5 px-5 py-4 text-sm text-danger">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message = "Nothing here yet." }) {
  return <div className="rounded-2xl border border-dashed border-forest/15 px-5 py-8 text-center text-sm text-charcoal/40">{message}</div>;
}
