"use client";

import { QueueLoadMoreBar } from "@/components/QueueLoadMoreBar";
import { QueueTable } from "@/components/QueueTable";
import { useQueueLoadMore } from "@/hooks/useQueueLoadMore";
import type { QueueItemRow } from "@/lib/triage/list-items";

type Props = {
  initialItems: QueueItemRow[];
  initialNextAfterId: string | null;
  pageSize: number;
  currentUserId: string | null;
  /** False for viewers — action buttons omitted (API still 403). */
  canMutate: boolean;
};

export function QueueList({
  initialItems,
  initialNextAfterId,
  pageSize,
  currentUserId,
  canMutate,
}: Props) {
  const { items, nextAfterId, error, pending, loadMore } = useQueueLoadMore(
    initialItems,
    initialNextAfterId,
    pageSize,
  );

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
        No items in this workspace yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <QueueTable
        items={items}
        currentUserId={currentUserId}
        canMutate={canMutate}
      />
      <QueueLoadMoreBar
        shownCount={items.length}
        nextAfterId={nextAfterId}
        canMutate={canMutate}
        signedIn={Boolean(currentUserId)}
        error={error}
        pending={pending}
        onLoadMore={loadMore}
      />
    </div>
  );
}
