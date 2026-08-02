"use client";

import { useState, useTransition } from "react";
import type { QueueItemRow } from "@/lib/triage/queue/queue-types";

type QueueItemJson = Omit<QueueItemRow, "createdAt" | "claimedAt"> & {
  createdAt: string;
  claimedAt?: string | null;
};

export function parseQueueItemJson(item: QueueItemRow | QueueItemJson): QueueItemRow {
  return {
    ...item,
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt
        : new Date(item.createdAt),
    claimedAt:
      item.claimedAt == null
        ? null
        : item.claimedAt instanceof Date
          ? item.claimedAt
          : new Date(item.claimedAt as string),
    notify: item.notify ?? null,
  };
}

/** Append-only Load more against `GET /api/queue?after=` (extras only; first page is RSC). */
export function useQueueLoadMore(
  initialNextAfterId: string | null,
  pageSize: number,
  /** Ids already rendered by the RSC first page — skip if a page overlaps. */
  initialItemIds: readonly string[] = [],
) {
  const [extraItems, setExtraItems] = useState<QueueItemRow[]>([]);
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
        const incoming = (body.items ?? []).map(parseQueueItemJson);
        setExtraItems((prev) => {
          const seen = new Set([...initialItemIds, ...prev.map((i) => i.id)]);
          return [...prev, ...incoming.filter((i) => !seen.has(i.id))];
        });
        setNextAfterId(body.nextAfterId ?? null);
      } catch {
        setError("Load failed — network error.");
      }
    });
  }

  return { extraItems, nextAfterId, error, pending, loadMore };
}
