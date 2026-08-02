import { QueueLoadMoreItems } from "@/components/queue/queue-load-more/QueueLoadMoreItems";
import { QueueTableItem } from "@/components/queue/queue-table/QueueTableItem";
import { QUEUE_PAGE_SIZE } from "@/lib/triage/queue/queue-constants";
import type { QueuePage } from "@/lib/triage/queue/queue-types";

type Props = {
  page: QueuePage;
  currentUserId: string | null;
  canMutate: boolean;
};

/**
 * Server table: first keyset page from RSC.
 * Load more / extra rows live in the `QueueLoadMoreItems` client island.
 */
export function QueueTable({ page, currentUserId, canMutate }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2.5 font-medium">Id</th>
            <th className="px-3 py-2.5 font-medium">Title</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Holder</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {page.items.map((item) => (
            <QueueTableItem
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              canMutate={canMutate}
            />
          ))}
        </tbody>
        <QueueLoadMoreItems
          nextAfterId={page.nextAfterId}
          seedIds={page.items.map((item) => item.id)}
          pageSize={QUEUE_PAGE_SIZE}
          currentUserId={currentUserId}
          canMutate={canMutate}
        />
      </table>
    </div>
  );
}
