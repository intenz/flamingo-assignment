"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import type { QueueItemRow } from "@/lib/triage/list-items";
import type {
  ActionNotice,
  ItemAction,
  ItemRowState,
} from "@/lib/triage/item-row-view";
import {
  formatNotifyNotice,
  noticeToneForNotifyStatus,
} from "@/lib/triage/item-row-view";
import { CLAIM_EXPIRED_MESSAGE, CLAIM_TTL_MS } from "@/lib/triage/claim-constants";

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

type OutboxBody = {
  ok?: boolean;
  message?: string;
  error?: string;
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

const POLL_MS = 500;
const POLL_MAX = 8; // cover ~1s after()-notify without auto-retrying drain
const DELIVERED_HIDE_MS = 2500;

/** Owns claim/resolve/release fetch + optimistic row reconcile after a lost claim. */
export function useItemActions(item: QueueItemRow, currentUserId: string | null) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [actionNotice, setActionNotice] = useState<ActionNotice | null>(null);
  const [retryOutboxId, setRetryOutboxId] = useState<string | null>(null);
  const [row, setRow] = useState<ItemRowState>(() => fromProps(item));
  const pollGen = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const claimExpiryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearHideTimer() {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }

  function clearClaimExpiryTimer() {
    if (claimExpiryTimer.current) {
      clearTimeout(claimExpiryTimer.current);
      claimExpiryTimer.current = null;
    }
  }

  /**
   * After Claim: wait CLAIM_TTL_MS, then re-read this row from the backend
   * (snapshot runs server sweep). Expiry decision stays on the server.
   */
  function scheduleClaimExpiryCheck() {
    clearClaimExpiryTimer();
    claimExpiryTimer.current = setTimeout(() => {
      claimExpiryTimer.current = null;
      void (async () => {
        try {
          const res = await fetch(
            `/api/queue/snapshot?ids=${encodeURIComponent(item.id)}`,
          );
          if (!res.ok) return;
          const body = (await res.json()) as {
            items?: Array<{
              id: string;
              status: QueueItemRow["status"];
              claimedById: string | null;
              claimedByName: string | null;
            }>;
          };
          const snap = body.items?.find((row) => row.id === item.id);
          if (!snap) return;
          setRow({
            status: snap.status,
            claimedById: snap.claimedById,
            claimedByName: snap.claimedByName,
          });
          if (snap.status === "open") {
            setActionNotice({
              text: CLAIM_EXPIRED_MESSAGE,
              tone: "warning",
            });
            setRetryOutboxId(null);
          }
        } catch {
          // Next user action / refresh will reconcile.
        }
      })();
    }, CLAIM_TTL_MS);
  }

  /** Show notify status; auto-hide only when delivered. */
  function showNotifyStatus(
    notify: NonNullable<OutboxBody["notify"]>,
    outboxId: string,
    gen: number,
  ): "continue" | "done" {
    setActionNotice({
      text: formatNotifyNotice(notify),
      tone: noticeToneForNotifyStatus(
        notify.status === "pending" && notify.attempts > 0
          ? "failed"
          : notify.status,
      ),
    });
    if (notify.status === "sent") {
      setRetryOutboxId(null);
      clearHideTimer();
      hideTimer.current = setTimeout(() => {
        if (pollGen.current !== gen) return;
        setActionNotice(null);
      }, DELIVERED_HIDE_MS);
      return "done";
    }
    // Failed, or pending after a failed send — stop polling; Resolve retries.
    if (notify.status === "failed" || notify.attempts > 0) {
      setRetryOutboxId(outboxId);
      return "done";
    }
    setRetryOutboxId(null);
    return "continue";
  }

  useEffect(() => {
    setRow(fromProps(item));
    if (item.status === "open") {
      clearHideTimer();
      clearClaimExpiryTimer();
      setActionNotice(null);
      setRetryOutboxId(null);
    }
  }, [item.status, item.claimedById, item.claimedByName]);

  // After refresh, restore undelivered notify from SSR/list so Resolve can retry.
  useEffect(() => {
    const n = item.notify;
    if (!n || n.status === "sent") return;

    setActionNotice({
      text: formatNotifyNotice(n),
      tone: noticeToneForNotifyStatus(
        n.status === "pending" && n.attempts > 0 ? "failed" : n.status,
      ),
    });
    // Resolver (claimedBy kept on resolve) can re-drain; others only see the notice.
    if (currentUserId && item.claimedById === currentUserId) {
      setRetryOutboxId(n.outboxId);
    }
  }, [
    item.id,
    item.notify,
    item.claimedById,
    currentUserId,
  ]);

  useEffect(() => {
    return () => {
      pollGen.current += 1;
      clearHideTimer();
      clearClaimExpiryTimer();
    };
  }, []);

  const canClaim = row.status === "open" && Boolean(currentUserId);
  const isHolder =
    row.status === "claimed" && row.claimedById === currentUserId;

  async function peekStatus(
    outboxId: string,
  ): Promise<OutboxBody["notify"] | null> {
    const res = await fetch(`/api/outbox/${outboxId}`);
    const body = (await res.json().catch(() => ({}))) as OutboxBody;
    if (!res.ok || !body.notify) return null;
    return body.notify;
  }

  async function drainOnce(
    outboxId: string,
    gen: number,
  ): Promise<OutboxBody["notify"] | null> {
    const res = await fetch(`/api/outbox/${outboxId}`, { method: "POST" });
    const body = (await res.json().catch(() => ({}))) as OutboxBody;
    if (!res.ok || !body.notify) {
      setActionNotice({
        text: body.message ?? body.error ?? "Notify retry failed.",
        tone: "failed",
      });
      setRetryOutboxId(outboxId);
      return null;
    }
    showNotifyStatus(body.notify, outboxId, gen);
    return body.notify;
  }

  /** Watch status only — first send is `after()` on the server; no auto-retries. */
  async function followNotify(outboxId: string) {
    const gen = ++pollGen.current;
    clearHideTimer();
    setRetryOutboxId(null);

    for (let i = 0; i < POLL_MAX; i++) {
      if (pollGen.current !== gen) return;
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (pollGen.current !== gen) return;

      const notify = await peekStatus(outboxId);
      if (!notify) continue;
      if (showNotifyStatus(notify, outboxId, gen) === "done") {
        return;
      }
    }

    const last = await peekStatus(outboxId);
    if (last) {
      showNotifyStatus(last, outboxId, gen);
      return;
    }
    setActionNotice({
      text: "Notify failed. Click Resolve to retry.",
      tone: "failed",
    });
    setRetryOutboxId(outboxId);
  }

  function run(action: ItemAction) {
    if (!currentUserId) return;
    if (action === "claim") {
      setActionNotice(null);
      setRetryOutboxId(null);
      clearClaimExpiryTimer();
    }

    // Already resolved: Resolve re-drains the pending/failed outbox (no new resolve).
    if (action === "resolve" && retryOutboxId) {
      const outboxId = retryOutboxId;
      startTransition(async () => {
        const gen = ++pollGen.current;
        clearHideTimer();
        setRetryOutboxId(null);
        setActionNotice({ text: "Notify: sending…", tone: "pending" });
        const notify = await drainOnce(outboxId, gen);
        if (pollGen.current !== gen) return;
        if (!notify) return;
        if (notify.status === "pending" || notify.status === "failed") {
          setActionNotice({
            text: formatNotifyNotice(notify),
            tone: noticeToneForNotifyStatus(notify.status),
          });
          setRetryOutboxId(outboxId);
        }
      });
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/items/${item.id}/${action}`, {
        method: "POST",
      });
      const body = (await res.json().catch(() => ({}))) as ActionApiBody;

      if (!res.ok) {
        if (action === "claim" || action === "resolve") {
          setActionNotice({
            text:
              body.message ??
              body.error ??
              `${action} failed (${res.status}).`,
            tone: body.message === CLAIM_EXPIRED_MESSAGE ? "warning" : "failed",
          });
        }
        // R5: resolve-after-expiry — row is open again; show that without waiting on refresh.
        if (
          action === "resolve" &&
          (body.message === CLAIM_EXPIRED_MESSAGE ||
            body.item?.status === "open")
        ) {
          setRow({
            status: "open",
            claimedById: null,
            claimedByName: null,
          });
          setRetryOutboxId(null);
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
        setActionNotice({
          text: body.message ?? `Already claimed by ${who}.`,
          tone: "warning",
        });
        return;
      }

      if (action === "claim" && body.outcome === "won") {
        setRow({
          status: "claimed",
          claimedById: body.item?.claimedById ?? currentUserId,
          claimedByName: body.item?.claimedByName ?? null,
        });
        setActionNotice(null);
        scheduleClaimExpiryCheck();
        return;
      }

      if (action === "resolve" && body.notify?.outboxId) {
        clearClaimExpiryTimer();
        const status = body.notify.status ?? "pending";
        setRow({
          status: "resolved",
          claimedById: body.item?.claimedById ?? currentUserId,
          claimedByName: body.item?.claimedByName ?? null,
        });
        setActionNotice({
          text: formatNotifyNotice({ status, attempts: 0 }),
          tone: noticeToneForNotifyStatus(status),
        });
        void followNotify(body.notify.outboxId);
        return;
      }

      if (action === "release" && body.ok !== false) {
        clearClaimExpiryTimer();
        setRow({
          status: "open",
          claimedById: null,
          claimedByName: null,
        });
        setActionNotice(null);
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
    });
  }

  return {
    row,
    pending,
    actionNotice,
    canRetryNotify: Boolean(retryOutboxId),
    canClaim,
    isHolder,
    run,
  };
}
