import type { QueueItemRow } from "@/lib/triage/list-items";
import { ItemActions } from "@/components/ItemActions";

type Props = {
  items: QueueItemRow[];
  cappedAt: number;
  currentUserId: string | null;
};

function holderLabel(item: QueueItemRow): string {
  if (item.status === "open") return "—";
  if (item.claimedByName) return item.claimedByName;
  if (item.claimedById) return item.claimedById;
  return "unknown";
}

function formatCreated(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function QueueList({ items, cappedAt, currentUserId }: Props) {
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
              <td className="px-3 py-2.5 font-mono text-xs text-muted">{item.id}</td>
              <td className="px-3 py-2.5 font-medium text-foreground">{item.title}</td>
              <td className="px-3 py-2.5">
                <StatusPill status={item.status} />
              </td>
              <td className="px-3 py-2.5 text-muted">{holderLabel(item)}</td>
              <td className="px-3 py-2.5 whitespace-nowrap text-muted">
                {formatCreated(item.createdAt)}
              </td>
              <td className="px-3 py-2.5">
                <ItemActions item={item} currentUserId={currentUserId} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-border px-3 py-2 text-xs text-muted">
        Showing {items.length} newest first (cap {cappedAt}). Keyset / load-more in
        R4. Claim is not yet race-safe (R1).
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: QueueItemRow["status"] }) {
  const styles =
    status === "open"
      ? "bg-success-soft text-success"
      : status === "claimed"
        ? "bg-warning-soft text-warning"
        : "bg-surface text-muted";

  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}
