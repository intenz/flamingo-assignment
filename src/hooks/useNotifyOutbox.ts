"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { OutboxApiBody } from "@/lib/triage/action-api";
import type { ActionNotice } from "@/lib/triage/item-row-view";
import {
  formatNotifyNotice,
  noticeToneForNotifyStatus,
} from "@/lib/triage/item-row-view";

const POLL_MS = 500;
const POLL_MAX = 8;
const DELIVERED_HIDE_MS = 2500;

type NotifyView = NonNullable<OutboxApiBody["notify"]>;

/**
 * Poll / re-drain notify outbox after resolve.
 * First send is server `after()` — this hook only watches, then retries on demand.
 */
export function useNotifyOutbox() {
  const [notice, setNotice] = useState<ActionNotice | null>(null);
  const [retryOutboxId, setRetryOutboxId] = useState<string | null>(null);
  const pollGen = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    pollGen.current += 1;
    clearHideTimer();
    setNotice(null);
    setRetryOutboxId(null);
  }, [clearHideTimer]);

  useEffect(() => () => reset(), [reset]);

  /** Paint notify status; auto-hide only when delivered. */
  const showStatus = useCallback(
    (
      notify: NotifyView,
      outboxId: string,
      gen: number,
    ): "continue" | "done" => {
      const toneStatus =
        notify.status === "pending" && notify.attempts > 0
          ? "failed"
          : notify.status;

      setNotice({
        text: formatNotifyNotice(notify),
        tone: noticeToneForNotifyStatus(toneStatus),
      });

      if (notify.status === "delivered") {
        setRetryOutboxId(null);
        clearHideTimer();
        hideTimer.current = setTimeout(() => {
          if (pollGen.current !== gen) return;
          setNotice(null);
        }, DELIVERED_HIDE_MS);
        return "done";
      }

      if (notify.status === "failed" || notify.attempts > 0) {
        setRetryOutboxId(outboxId);
        return "done";
      }

      setRetryOutboxId(null);
      return "continue";
    },
    [clearHideTimer],
  );

  const peekStatus = useCallback(async (outboxId: string) => {
    const res = await fetch(`/api/outbox/${outboxId}`);
    const body = (await res.json().catch(() => ({}))) as OutboxApiBody;
    if (!res.ok || !body.notify) return null;
    return body.notify;
  }, []);

  const drainOnce = useCallback(
    async (outboxId: string, gen: number) => {
      const res = await fetch(`/api/outbox/${outboxId}`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as OutboxApiBody;
      if (!res.ok || !body.notify) {
        setNotice({
          text: body.message ?? body.error ?? "Notify retry failed.",
          tone: "failed",
        });
        setRetryOutboxId(outboxId);
        return null;
      }
      showStatus(body.notify, outboxId, gen);
      return body.notify;
    },
    [showStatus],
  );

  /** Watch status only — no auto-retry of drain. */
  const follow = useCallback(
    async (outboxId: string) => {
      const gen = ++pollGen.current;
      clearHideTimer();
      setRetryOutboxId(null);

      for (let i = 0; i < POLL_MAX; i++) {
        if (pollGen.current !== gen) return;
        await new Promise((r) => setTimeout(r, POLL_MS));
        if (pollGen.current !== gen) return;

        const notify = await peekStatus(outboxId);
        if (!notify) continue;
        if (showStatus(notify, outboxId, gen) === "done") return;
      }

      const last = await peekStatus(outboxId);
      if (last) {
        showStatus(last, outboxId, gen);
        return;
      }
      setNotice({
        text: "Notify failed. Click Resolve to retry.",
        tone: "failed",
      });
      setRetryOutboxId(outboxId);
    },
    [clearHideTimer, peekStatus, showStatus],
  );

  /** Explicit Resolve-click re-drain for pending/failed outbox. */
  const retryDrain = useCallback(
    async (outboxId: string) => {
      const gen = ++pollGen.current;
      clearHideTimer();
      setRetryOutboxId(null);
      setNotice({ text: "Notify: sending…", tone: "pending" });

      const notify = await drainOnce(outboxId, gen);
      if (pollGen.current !== gen || !notify) return;

      if (notify.status === "pending" || notify.status === "failed") {
        setNotice({
          text: formatNotifyNotice(notify),
          tone: noticeToneForNotifyStatus(notify.status),
        });
        setRetryOutboxId(outboxId);
      }
    },
    [clearHideTimer, drainOnce],
  );

  const hydrateFromList = useCallback(
    (args: {
      outboxId: string;
      status: "pending" | "delivered" | "failed";
      attempts: number;
      lastError: string | null;
      canRetry: boolean;
    }) => {
      if (args.status === "delivered") return;
      setNotice({
        text: formatNotifyNotice(args),
        tone: noticeToneForNotifyStatus(
          args.status === "pending" && args.attempts > 0
            ? "failed"
            : args.status,
        ),
      });
      if (args.canRetry) setRetryOutboxId(args.outboxId);
    },
    [],
  );

  const beginPending = useCallback(
    (outboxId: string, status: "pending" | "delivered" | "failed") => {
      setNotice({
        text: formatNotifyNotice({ status, attempts: 0 }),
        tone: noticeToneForNotifyStatus(status),
      });
      void follow(outboxId);
    },
    [follow],
  );

  return {
    notice,
    setNotice,
    retryOutboxId,
    canRetry: Boolean(retryOutboxId),
    reset,
    follow,
    retryDrain,
    hydrateFromList,
    beginPending,
  };
}
