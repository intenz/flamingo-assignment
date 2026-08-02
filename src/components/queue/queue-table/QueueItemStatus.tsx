import { claimLooksStale } from "@/lib/triage/queue/queue-constants";
import type { QueueItemRow } from "@/lib/triage/queue/queue-types";

type Props = {
  status: QueueItemRow["status"];
  /** When claimed — used only for a display hint, not to flip status. */
  claimedAt?: Date | null;
};

export function QueueItemStatus({ status, claimedAt = null }: Props) {
  const stale = status === "claimed" && claimLooksStale(claimedAt);
  const styles =
    status === "open"
      ? "bg-success-soft text-success"
      : status === "claimed"
        ? stale
          ? "bg-danger-soft text-danger"
          : "bg-warning-soft text-warning"
        : "bg-surface text-muted";

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles}`}
      title={stale ? "Past 30m TTL — server will reopen on next sweep" : undefined}
    >
      {stale ? "claimed · stale" : status}
    </span>
  );
}
