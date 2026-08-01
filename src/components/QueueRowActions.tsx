"use client";

import { ItemActionButtons } from "@/components/ItemActionButtons";
import { StatusPill } from "@/components/StatusPill";
import { useItemActions } from "@/hooks/useItemActions";
import type { QueueItemRow } from "@/lib/triage/list-items";
import { formatCreatedAt, holderLabel } from "@/lib/triage/item-row-view";

type Props = {
  item: QueueItemRow;
  currentUserId: string | null;
};

/**
 * Client island for status / holder / created / actions.
 * Status+holder update locally after a lost claim; notice renders under buttons.
 */
export function QueueRowActions({ item, currentUserId }: Props) {
  const { row, pending, claimHint, canClaim, isHolder, run } = useItemActions(
    item,
    currentUserId,
  );

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
        {!currentUserId ? (
          <span className="text-xs text-muted">—</span>
        ) : (
          <ItemActionButtons
            canClaim={canClaim}
            isHolder={isHolder}
            pending={pending}
            notice={claimHint}
            onClaim={() => run("claim")}
            onResolve={() => run("resolve")}
            onRelease={() => run("release")}
          />
        )}
      </td>
    </>
  );
}
