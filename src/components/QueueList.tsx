import type { QueueItemRow } from "@/lib/triage/list-items";

type Props = {
  items: QueueItemRow[];
  cappedAt: number;
};

function holderLabel(item: QueueItemRow): string {
  if (item.status === "open") return "—";
  if (item.claimedByName) return item.claimedByName;
  if (item.claimedById) return item.claimedById;
  return "unknown";
}

export function QueueList({ items, cappedAt }: Props) {
  if (items.length === 0) {
    return (
      <p className="rounded border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-600">
        No items in this workspace yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
          <tr>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Title</th>
            <th className="px-3 py-2 font-medium">Holder</th>
            <th className="px-3 py-2 font-medium">Id</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-zinc-100 last:border-0">
              <td className="px-3 py-2">
                <StatusPill status={item.status} />
              </td>
              <td className="px-3 py-2 font-medium text-zinc-900">{item.title}</td>
              <td className="px-3 py-2 text-zinc-600">{holderLabel(item)}</td>
              <td className="px-3 py-2 font-mono text-xs text-zinc-500">{item.id}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zinc-100 px-3 py-2 text-xs text-zinc-500">
        Showing {items.length} newest (cap {cappedAt}). Keyset / load-more in R4.
      </p>
    </div>
  );
}

function StatusPill({ status }: { status: QueueItemRow["status"] }) {
  const styles =
    status === "open"
      ? "bg-emerald-50 text-emerald-800"
      : status === "claimed"
        ? "bg-amber-50 text-amber-900"
        : "bg-zinc-100 text-zinc-600";

  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${styles}`}>
      {status}
    </span>
  );
}
