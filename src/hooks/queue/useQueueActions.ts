"use client";

import { useEffect, useState, useTransition } from "react";
import { useQueueNotifyOutbox } from "@/hooks/queue/useQueueNotifyOutbox";
import type {
  QueueActionApiBody,
  QueueItemAction,
  QueueItemRow,
  QueueItemRowState,
} from "@/lib/triage/queue/queue-types";
import {
  CLAIM_EXPIRED_MESSAGE,
  claimLooksStale,
  STALE_CLAIM_HINT,
} from "@/lib/triage/queue/queue-constants";

function toQueueItemRowState(item: QueueItemRow): QueueItemRowState {
  return {
    status: item.status,
    claimedById: item.claimedById,
    claimedByName: item.claimedByName,
    claimedAt: item.claimedAt,
  };
}

/**
 * Row mutations: POST API → patch local state only.
 * No router.refresh() here — the RSC shell (session + first page) stays put;
 * user switch refresh lives in UserPicker.
 */
export function useQueueActions(
  item: QueueItemRow,
  currentUserId: string | null,
) {
  const [pending, startTransition] = useTransition();
  const [row, setRow] = useState<QueueItemRowState>(() => toQueueItemRowState(item));
  const notify = useQueueNotifyOutbox();

  // Sync local row from server props after refresh / user switch; show stale-claim hint (R5).
  useEffect(() => {
    setRow(toQueueItemRowState(item));
    if (item.status === "open") {
      notify.reset();
      return;
    }
    // R5 display truth: do not flip status client-side; warn when past TTL.
    if (
      item.status === "claimed" &&
      claimLooksStale(item.claimedAt) &&
      !item.notify
    ) {
      notify.setNotice({ text: STALE_CLAIM_HINT, tone: "warning" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.status, item.claimedById, item.claimedByName, item.claimedAt]);

  // After list/RSC refresh: restore pending/failed notify UI; kick drain if attempts === 0.
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

  function performAction(action: QueueItemAction) {
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
      const res = await fetch(`/api/queue/queue-actions/${item.id}/${action}`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as QueueActionApiBody;

      if (!res.ok) {
        applyError(action, body);
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
        setRow({
          status: "open",
          claimedById: null,
          claimedByName: null,
          claimedAt: null,
        });
        notify.reset();
        return;
      }

      if (body.item) {
        setRow({
          status: body.item.status ?? row.status,
          claimedById: body.item.claimedById ?? null,
          claimedByName: body.item.claimedByName ?? null,
          claimedAt: row.claimedAt,
        });
      }
      notify.reset();
    });
  }

  function applyError(action: QueueItemAction, body: QueueActionApiBody) {
    const expiredResolve =
      action === "resolve" &&
      (body.message === CLAIM_EXPIRED_MESSAGE || body.item?.status === "open");

    if (expiredResolve) {
      setRow({
        status: "open",
        claimedById: null,
        claimedByName: null,
        claimedAt: null,
      });
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

  function applyClaim(body: QueueActionApiBody, userId: string) {
    if (body.outcome === "already_claimed") {
      const next: QueueItemRowState = {
        status: body.item?.status ?? "claimed",
        claimedById: body.item?.claimedById ?? body.holder?.id ?? null,
        claimedByName: body.item?.claimedByName ?? body.holder?.name ?? null,
        claimedAt: row.claimedAt,
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
        claimedAt: new Date(),
      });
      notify.reset();
    }
  }

  function applyResolve(body: QueueActionApiBody, userId: string) {
    if (!body.notify?.outboxId) return;
    const status = body.notify.status ?? "pending";
    setRow({
      status: "resolved",
      claimedById: body.item?.claimedById ?? userId,
      claimedByName: body.item?.claimedByName ?? null,
      claimedAt: null,
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
    performAction,
  };
}
