"use client";

type Props = {
  shownCount: number;
  nextAfterId: string | null;
  canMutate: boolean;
  signedIn: boolean;
  error: string | null;
  pending: boolean;
  onLoadMore: () => void;
};

export function QueueLoadMoreButton({
  shownCount,
  nextAfterId,
  canMutate,
  signedIn,
  error,
  pending,
  onLoadMore,
}: Props) {
  return (
    <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
      <p className="text-xs text-muted">
        Showing {shownCount} newest first
        {nextAfterId ? " — more available." : " — end of queue."}
        {!canMutate && signedIn ? " Viewer role — queue is read-only." : null}
      </p>
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {nextAfterId ? (
        <button
          type="button"
          onClick={onLoadMore}
          disabled={pending}
          className="self-start rounded-lg bg-flamingo-pink px-3 py-1.5 text-sm font-medium text-white transition hover:bg-flamingo-pink-hover disabled:opacity-60"
        >
          {pending ? "Loading…" : "Load more"}
        </button>
      ) : null}
    </div>
  );
}
