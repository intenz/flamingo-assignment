import { QueueEmptyState } from "@/components/queue/QueueEmptyState";
import { QueueTable } from "@/components/queue/queue-table/QueueTable";
import { DEFAULT_WORKSPACE_ID } from "@/lib/auth/membership";
import type { QueueInitialState } from "@/lib/triage/queue/load-initial-queue";

type Props = {
  signedIn: boolean;
  queue: QueueInitialState;
};

export function QueueSection({ signedIn, queue }: Props) {
  const items = queue.page.items;
  const showEmpty =
    !signedIn || !queue.hasWorkspaceMembership || items.length === 0;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">Queue</h2>
        <span className="font-mono text-xs text-muted">{DEFAULT_WORKSPACE_ID}</span>
      </div>

      {showEmpty ? (
        <QueueEmptyState
          signedIn={signedIn}
          hasWorkspaceMembership={queue.hasWorkspaceMembership}
          isEmpty={items.length === 0}
        />
      ) : (
        <QueueTable
          page={queue.page}
          currentUserId={queue.viewerId}
          canMutate={queue.canMutate}
        />
      )}
    </section>
  );
}
