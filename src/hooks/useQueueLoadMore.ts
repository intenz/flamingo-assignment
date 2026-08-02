"use client";

import { useState, useTransition } from "react";
import type { QueueItemRow } from "@/lib/triage/list-items";

type QueueItemJson = Omit<QueueItemRow, "createdAt"> & {
  createdAt: string;
};

export function toQueueRow(item: QueueItemRow | QueueItemJson): QueueItemRow {
  return {
    ...item,
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt
        : new Date(item.createdAt),
    notify: item.notify ?? null,
  };
}

/** Append-only Load more against `GET /api/queue?after=`. */
export function useQueueLoadMore(
  initialItems: QueueItemRow[],
  initialNextAfterId: string | null,
  pageSize: number,
) {
  const [items, setItems] = useState(() => initialItems.map(toQueueRow));
  const [nextAfterId, setNextAfterId] = useState(initialNextAfterId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function loadMore() {
    if (!nextAfterId || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/queue?after=${encodeURIComponent(nextAfterId)}&take=${pageSize}`,
        );
        const body = (await res.json()) as {
          items?: QueueItemJson[];
          nextAfterId?: string | null;
          message?: string;
        };
        if (!res.ok) {
          setError(body.message ?? `Load failed (${res.status}).`);
          return;
        }
        const incoming = (body.items ?? []).map(toQueueRow);
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          return [...prev, ...incoming.filter((i) => !seen.has(i.id))];
        });
        setNextAfterId(body.nextAfterId ?? null);
      } catch {
        setError("Load failed — network error.");
      }
    });
  }

  return { items, nextAfterId, error, pending, loadMore };
}
