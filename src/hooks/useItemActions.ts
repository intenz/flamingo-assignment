"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { QueueItemRow } from "@/lib/triage/list-items";
import type { ItemAction, ItemRowState } from "@/lib/triage/item-row-view";

type ClaimApiBody = {
  ok?: boolean;
  outcome?: string;
  message?: string;
  error?: string;
  item?: {
    status?: QueueItemRow["status"];
    claimedById?: string | null;
    claimedByName?: string | null;
  };
  holder?: { id: string; name: string | null } | null;
};

function fromProps(item: QueueItemRow): ItemRowState {
  return {
    status: item.status,
    claimedById: item.claimedById,
    claimedByName: item.claimedByName,
  };
}

/** Owns claim/resolve/release fetch + optimistic row reconcile after a lost claim. */
export function useItemActions(item: QueueItemRow, currentUserId: string | null) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [claimHint, setClaimHint] = useState<string | null>(null);
  const [row, setRow] = useState<ItemRowState>(() => fromProps(item));

  useEffect(() => {
    setRow(fromProps(item));
    // Keep claimHint after refresh so the tooltip still explains a lost race;
    // clear only when the item is open again (or on the next claim attempt).
    if (item.status === "open") {
      setClaimHint(null);
    }
  }, [item.status, item.claimedById, item.claimedByName]);

  const canClaim = row.status === "open" && Boolean(currentUserId);
  const isHolder =
    row.status === "claimed" && row.claimedById === currentUserId;

  function run(action: ItemAction) {
    if (!currentUserId) return;
    if (action === "claim") setClaimHint(null);

    startTransition(async () => {
      const res = await fetch(`/api/items/${item.id}/${action}`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as ClaimApiBody;

      if (!res.ok) {
        if (action === "claim") {
          setClaimHint(
            body.message ?? body.error ?? `Claim failed (${res.status}).`,
          );
        }
        router.refresh();
        return;
      }

      if (action === "claim" && body.outcome === "already_claimed") {
        const next: ItemRowState = {
          status: body.item?.status ?? "claimed",
          claimedById: body.item?.claimedById ?? body.holder?.id ?? null,
          claimedByName: body.item?.claimedByName ?? body.holder?.name ?? null,
        };
        const who = next.claimedByName ?? next.claimedById ?? "someone else";
        setRow(next);
        setClaimHint(body.message ?? `Already claimed by ${who}.`);
        router.refresh();
        return;
      }

      if (body.item) {
        setRow({
          status: body.item.status ?? row.status,
          claimedById: body.item.claimedById ?? null,
          claimedByName: body.item.claimedByName ?? null,
        });
      }
      setClaimHint(null);
      router.refresh();
    });
  }

  return {
    row,
    pending,
    claimHint,
    canClaim,
    isHolder,
    run,
  };
}
