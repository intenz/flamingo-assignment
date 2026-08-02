"use client";

import { QueueActionButtons } from "@/components/queue/queue-table/QueueActionButtons";
import { QueueItemStatus } from "@/components/queue/queue-table/QueueItemStatus";
import { useQueueActions } from "@/hooks/queue/useQueueActions";
import type { QueueItemRow } from "@/lib/triage/queue/queue-types";
import { formatCreatedAt, holderLabel } from "@/lib/triage/queue/format-queue-item";

type Props = {
  item: QueueItemRow;
  currentUserId: string | null;
  canMutate: boolean;
};

/**
 * Client island for status / holder / created / actions.
 * One `useQueueActions` here — row for cells, the rest passed into QueueActionButtons.
 */
export function QueueTableItemDynamic({ item, currentUserId, canMutate }: Props) {
  const {
    row,
    pending,
    actionNotice,
    canRetryNotify,
    canClaim,
    isHolder,
    performAction,
  } = useQueueActions(item, currentUserId);

  return (
    <>
      <td className="px-3 py-2.5">
        <QueueItemStatus status={row.status} claimedAt={row.claimedAt} />
      </td>
      <td className="px-3 py-2.5 text-muted">{holderLabel(row)}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
        {formatCreatedAt(item.createdAt)}
      </td>
      <td className="px-3 py-2.5">
        {!currentUserId || !canMutate ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          <QueueActionButtons
            canClaim={canClaim}
            isHolder={isHolder}
            canRetryNotify={canRetryNotify}
            pending={pending}
            notice={actionNotice}
            onClaim={() => performAction("claim")}
            onResolve={() => performAction("resolve")}
            onRelease={() => performAction("release")}
          />
        )}
      </td>
    </>
  );
}
