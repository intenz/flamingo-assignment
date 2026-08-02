"use client";

import { QueueRowActions } from "@/components/QueueRowActions";
import type { QueueItemRow } from "@/lib/triage/list-items";

type Props = {
  items: QueueItemRow[];
  currentUserId: string | null;
  canMutate: boolean;
};

export function QueueTable({ items, currentUserId, canMutate }: Props) {
  return (
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
          <tr
            key={item.id}
            className="border-b border-border/70 last:border-0"
          >
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
  );
}
