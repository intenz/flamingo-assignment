import type { QueueItemRow } from "@/lib/triage/list-items";

export function StatusPill({ status }: { status: QueueItemRow["status"] }) {
  const styles =
    status === "open"
      ? "bg-success-soft text-success"
      : status === "claimed"
        ? "bg-warning-soft text-warning"
        : "bg-surface text-muted";

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {status}
    </span>
  );
}
