type Props = {
  signedIn: boolean;
  hasWorkspaceMembership: boolean;
  isEmpty: boolean;
};

/** Placeholder when the queue table cannot (or need not) render. */
export function QueueEmptyState({
  signedIn,
  hasWorkspaceMembership,
  isEmpty,
}: Props) {
  if (!signedIn) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
        Pick a user above to load the workspace queue.
      </p>
    );
  }

  if (!hasWorkspaceMembership) {
    return (
      <p className="rounded-2xl border border-danger-soft bg-danger-soft px-4 py-8 text-center text-sm text-danger">
        No membership in this workspace — nothing to show.
      </p>
    );
  }

  if (isEmpty) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
        No items in this workspace yet.
      </p>
    );
  }

  return null;
}
