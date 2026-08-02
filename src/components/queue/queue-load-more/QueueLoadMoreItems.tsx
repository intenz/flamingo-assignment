"use client";

import { QueueLoadMoreButton } from "@/components/queue/queue-load-more/QueueLoadMoreButton";
import { QueueTableItemDynamic } from "@/components/queue/queue-table/QueueTableItemDynamic";
import { useQueueLoadMore } from "@/hooks/queue/useQueueLoadMore";

type Props = {
  nextAfterId: string | null;
  /** First-page ids (dedupe + shown count). */
  seedIds: readonly string[];
  pageSize: number;
  currentUserId: string | null;
  canMutate: boolean;
};

/**
 * Client island: appends older pages + Load more control.
 * Must sit inside `<table>` (extra `<tbody>` + `<tfoot>`).
 * Renders row markup here — cannot import server `QueueTableItem`.
 */
export function QueueLoadMoreItems({
  nextAfterId: initialNextAfterId,
  seedIds,
  pageSize,
  currentUserId,
  canMutate,
}: Props) {
  const { extraItems, nextAfterId, error, pending, loadMore } = useQueueLoadMore(
    initialNextAfterId,
    pageSize,
    seedIds,
  );

  return (
    <>
      {extraItems.length > 0 ? (
        <tbody>
          {extraItems.map((item) => (
            <tr
              key={item.id}
              className="border-b border-border/70 last:border-0"
            >
              <td className="px-3 py-2.5 font-mono text-xs text-muted">
                {item.id}
              </td>
              <td className="px-3 py-2.5 font-medium text-foreground">
                {item.title}
              </td>
              <QueueTableItemDynamic
                item={item}
                currentUserId={currentUserId}
                canMutate={canMutate}
              />
            </tr>
          ))}
        </tbody>
      ) : null}
      <tfoot>
        <tr>
          <td colSpan={6} className="p-0">
            <QueueLoadMoreButton
              shownCount={seedIds.length + extraItems.length}
              nextAfterId={nextAfterId}
              canMutate={canMutate}
              signedIn={Boolean(currentUserId)}
              error={error}
              pending={pending}
              onLoadMore={loadMore}
            />
          </td>
        </tr>
      </tfoot>
    </>
  );
}
