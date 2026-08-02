"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { QueueItemRow } from "@/lib/triage/list-items";
import type { ItemAction, ItemRowState } from "@/lib/triage/item-row-view";
import { formatNotifyNotice } from "@/lib/triage/item-row-view";

type ActionApiBody = {
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
  notify?: {
    outboxId: string;
    status: "pending" | "sent" | "failed";
    message?: string;
  };
};

type OutboxPollBody = {
  ok?: boolean;
  notify?: {
    status: "pending" | "sent" | "failed";
    attempts: number;
    lastError: string | null;
  };
};

function fromProps(item: QueueItemRow): ItemRowState {
  return {
    status: item.status,
    claimedById: item.claimedById,
    claimedByName: item.claimedByName,
  };
}

const POLL_MS = 600;
const POLL_MAX = 20;

/** Owns claim/resolve/release fetch + optimistic row reconcile after a lost claim. */
export function useItemActions(item: QueueItemRow, currentUserId: string | null) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [row, setRow] = useState<ItemRowState>(() => fromProps(item));
  const pollGen = useRef(0);

  useEffect(() => {
    setRow(fromProps(item));
    if (item.status === "open") {
      setActionNotice(null);
    }
  }, [item.status, item.claimedById, item.claimedByName]);

  useEffect(() => {
    return () => {
      pollGen.current += 1;
    };
  }, []);

  const canClaim = row.status === "open" && Boolean(currentUserId);
  const isHolder =
    row.status === "claimed" && row.claimedById === currentUserId;

  async function pollNotify(outboxId: string) {
    const gen = ++pollGen.current;
    for (let i = 0; i < POLL_MAX; i++) {
      if (pollGen.current !== gen) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (pollGen.current !== gen) return;

      const res = await fetch(`/api/outbox/${outboxId}`);
      const body = (await res.json().catch(() => ({}))) as OutboxPollBody;
      if (!res.ok || !body.notify) {
        setActionNotice(
          body && "error" in body
            ? String((body as { message?: string }).message ?? "Notify status unavailable.")
            : "Notify status unavailable.",
        );
        return;
      }

      setActionNotice(formatNotifyNotice(body.notify));
      if (body.notify.status === "sent" || body.notify.status === "failed") {
        return;
      }
    }
    setActionNotice("Notify: still pending — try POST /api/outbox/drain");
  }

  function run(action: ItemAction) {
    if (!currentUserId) return;
    if (action === "claim") setActionNotice(null);

    startTransition(async () => {
      const res = await fetch(`/api/items/${item.id}/${action}`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as ActionApiBody;

      if (!res.ok) {
        if (action === "claim" || action === "resolve") {
          setActionNotice(
            body.message ?? body.error ?? `${action} failed (${res.status}).`,
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
        setActionNotice(body.message ?? `Already claimed by ${who}.`);
        router.refresh();
        return;
      }

      if (action === "resolve" && body.notify?.outboxId) {
        setRow({
          status: "resolved",
          claimedById: null,
          claimedByName: null,
        });
        setActionNotice(
          formatNotifyNotice({
            status: body.notify.status ?? "pending",
            attempts: 0,
          }),
        );
        router.refresh();
        void pollNotify(body.notify.outboxId);
        return;
      }

      if (body.item) {
        setRow({
          status: body.item.status ?? row.status,
          claimedById: body.item.claimedById ?? null,
          claimedByName: body.item.claimedByName ?? null,
        });
      }
      setActionNotice(null);
      router.refresh();
    });
  }

  return {
    row,
    pending,
    claimHint: actionNotice,
    canClaim,
    isHolder,
    run,
  };
}
