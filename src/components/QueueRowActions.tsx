"use client";

import { ItemActionButtons } from "@/components/ItemActionButtons";
import { StatusPill } from "@/components/StatusPill";
import { useItemActions } from "@/hooks/useItemActions";
import type { QueueItemRow } from "@/lib/triage/list-items";
import { formatCreatedAt, holderLabel } from "@/lib/triage/item-row-view";

type Props = {
  item: QueueItemRow;
  currentUserId: string | null;
  canMutate: boolean;
};

/**
 * Client island for status / holder / created / actions.
 * Status+holder update locally after a lost claim; notice renders under buttons.
 * Viewers get no action controls (R2) — mutations are still sealed server-side.
 */
export function QueueRowActions({ item, currentUserId, canMutate }: Props) {
  const {
    row,
    pending,
    actionNotice,
    canRetryNotify,
    canClaim,
    isHolder,
    run,
  } = useItemActions(item, currentUserId);

  return (
    <>
      <td className="px-3 py-2.5">
        <StatusPill status={row.status} />
      </td>
      <td className="px-3 py-2.5 text-muted">{holderLabel(row)}</td>
      <td className="whitespace-nowrap px-3 py-2.5 text-muted">
        {formatCreatedAt(item.createdAt)}
      </td>
      <td className="px-3 py-2.5">
        {!currentUserId || !canMutate ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          <ItemActionButtons
            canClaim={canClaim}
            isHolder={isHolder}
            canRetryNotify={canRetryNotify}
            pending={pending}
            notice={actionNotice}
            onClaim={() => run("claim")}
            onResolve={() => run("resolve")}
            onRelease={() => run("release")}
          />
        )}
      </td>
    </>
  );
}
