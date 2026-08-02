"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useNotifyOutbox } from "@/hooks/useNotifyOutbox";
import type { ActionApiBody } from "@/lib/triage/action-api";
import { CLAIM_EXPIRED_MESSAGE } from "@/lib/triage/claim-constants";
import type { ItemAction, ItemRowState } from "@/lib/triage/item-row-view";
import type { QueueItemRow } from "@/lib/triage/list-items";

function rowFromProps(item: QueueItemRow): ItemRowState {
  return {
    status: item.status,
    claimedById: item.claimedById,
    claimedByName: item.claimedByName,
  };
}

/** Claim / resolve / release fetch + local row reconcile (lost claim, expiry, notify). */
export function useItemActions(
  item: QueueItemRow,
  currentUserId: string | null,
) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [row, setRow] = useState<ItemRowState>(() => rowFromProps(item));
  const notify = useNotifyOutbox();

  useEffect(() => {
    setRow(rowFromProps(item));
    if (item.status === "open") notify.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when row opens
  }, [item.status, item.claimedById, item.claimedByName]);

  // After refresh: restore undelivered notify so Resolve can retry.
  useEffect(() => {
    const n = item.notify;
    if (!n || n.status === "delivered") return;
    notify.hydrateFromList({
      ...n,
      canRetry: Boolean(currentUserId && item.claimedById === currentUserId),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.notify, item.claimedById, currentUserId]);

  const canClaim = row.status === "open" && Boolean(currentUserId);
  const isHolder =
    row.status === "claimed" && row.claimedById === currentUserId;

  function run(action: ItemAction) {
    if (!currentUserId) return;

    if (action === "claim") notify.reset();

    // Already resolved: Resolve re-drains pending/failed outbox.
    if (action === "resolve" && notify.retryOutboxId) {
      const outboxId = notify.retryOutboxId;
      startTransition(async () => {
        await notify.retryDrain(outboxId);
      });
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/items/${item.id}/${action}`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as ActionApiBody;

      if (!res.ok) {
        applyError(action, body);
        router.refresh();
        return;
      }

      if (action === "claim") {
        applyClaim(body, currentUserId);
        return;
      }
      if (action === "resolve") {
        applyResolve(body, currentUserId);
        return;
      }
      if (action === "release" && body.ok !== false) {
        setRow({ status: "open", claimedById: null, claimedByName: null });
        notify.reset();
        return;
      }

      if (body.item) {
        setRow({
          status: body.item.status ?? row.status,
          claimedById: body.item.claimedById ?? null,
          claimedByName: body.item.claimedByName ?? null,
        });
      }
      notify.reset();
    });
  }

  function applyError(action: ItemAction, body: ActionApiBody) {
    const expiredResolve =
      action === "resolve" &&
      (body.message === CLAIM_EXPIRED_MESSAGE || body.item?.status === "open");

    if (expiredResolve) {
      setRow({ status: "open", claimedById: null, claimedByName: null });
      notify.reset();
      notify.setNotice({
        text: body.message ?? CLAIM_EXPIRED_MESSAGE,
        tone: "warning",
      });
      return;
    }

    if (action === "claim" || action === "resolve") {
      notify.setNotice({
        text: body.message ?? body.error ?? `${action} failed.`,
        tone: "failed",
      });
    }
  }

  function applyClaim(body: ActionApiBody, userId: string) {
    if (body.outcome === "already_claimed") {
      const next: ItemRowState = {
        status: body.item?.status ?? "claimed",
        claimedById: body.item?.claimedById ?? body.holder?.id ?? null,
        claimedByName: body.item?.claimedByName ?? body.holder?.name ?? null,
      };
      const who = next.claimedByName ?? next.claimedById ?? "someone else";
      setRow(next);
      notify.setNotice({
        text: body.message ?? `Already claimed by ${who}.`,
        tone: "warning",
      });
      return;
    }
    if (body.outcome === "won") {
      setRow({
        status: "claimed",
        claimedById: body.item?.claimedById ?? userId,
        claimedByName: body.item?.claimedByName ?? null,
      });
      notify.reset();
    }
  }

  function applyResolve(body: ActionApiBody, userId: string) {
    if (!body.notify?.outboxId) return;
    const status = body.notify.status ?? "pending";
    setRow({
      status: "resolved",
      claimedById: body.item?.claimedById ?? userId,
      claimedByName: body.item?.claimedByName ?? null,
    });
    notify.beginPending(body.notify.outboxId, status);
  }

  return {
    row,
    pending,
    actionNotice: notify.notice,
    canRetryNotify: notify.canRetry,
    canClaim,
    isHolder,
    run,
  };
}
