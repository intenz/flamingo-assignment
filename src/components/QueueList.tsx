"use client";

import { useState, useTransition } from "react";
import { QueueRowActions } from "@/components/QueueRowActions";
import type { QueueItemRow } from "@/lib/triage/list-items";

type QueueItemJson = Omit<QueueItemRow, "createdAt"> & {
  createdAt: string;
};

type Props = {
  initialItems: QueueItemRow[];
  initialNextAfterId: string | null;
  pageSize: number;
  currentUserId: string | null;
  /** False for viewers — action buttons are omitted (API still 403). */
  canMutate: boolean;
};

function toRow(item: QueueItemRow | QueueItemJson): QueueItemRow {
  return {
    ...item,
    createdAt:
      item.createdAt instanceof Date
        ? item.createdAt
        : new Date(item.createdAt),
  };
}

export function QueueList({
  initialItems,
  initialNextAfterId,
  pageSize,
  currentUserId,
  canMutate,
}: Props) {
  const [items, setItems] = useState(() => initialItems.map(toRow));
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
        const incoming = (body.items ?? []).map(toRow);
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const appended = incoming.filter((i) => !seen.has(i.id));
          return [...prev, ...appended];
        });
        setNextAfterId(body.nextAfterId ?? null);
      } catch {
        setError("Load failed — network error.");
      }
    });
  }

  if (items.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted">
        No items in this workspace yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
        <thead className="border-b border-border bg-surface text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-3 py-2.5 font-medium">Id</th>
            <th className="px-3 py-2.5 font-medium">Title</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
            <th className="px-3 py-2.5 font-medium">Holder</th>
            <th className="px-3 py-2.5 font-medium">Created</th>
            <th className="px-3 py-2.5 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/70 last:border-0">
              <td className="px-3 py-2.5 font-mono text-xs text-muted">
                {item.id}
              </td>
              <td className="px-3 py-2.5 font-medium text-foreground">
                {item.title}
              </td>
              <QueueRowActions
                item={item}
                currentUserId={currentUserId}
                canMutate={canMutate}
              />
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-col gap-2 border-t border-border px-3 py-3">
        <p className="text-xs text-muted">
          Showing {items.length} newest first
          {nextAfterId ? " — more available." : " — end of queue."}
          {!canMutate && currentUserId
            ? " Viewer role — queue is read-only."
            : null}
        </p>
        {error ? (
          <p className="text-xs text-danger" role="alert">
            {error}
          </p>
        ) : null}
        {nextAfterId ? (
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="self-start rounded-lg bg-flamingo-pink px-3 py-1.5 text-sm font-medium text-white transition hover:bg-flamingo-pink-hover disabled:opacity-60"
          >
            {pending ? "Loading…" : "Load more"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
