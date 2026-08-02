import type {
  QueueItemRowState,
  QueueNoticeTone,
  QueueNotifyStatus,
} from "@/lib/triage/queue/queue-types";
import { NOTIFY_FAILED_RETRY } from "@/lib/triage/queue/queue-constants";

export function formatCreatedAt(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function holderLabel(row: QueueItemRowState): string {
  if (row.status === "open") return "—";
  if (row.claimedByName) return row.claimedByName;
  if (row.claimedById) return row.claimedById;
  return "—";
}

export function formatNotifyNotice(view: {
  status: QueueNotifyStatus;
  attempts: number;
  lastError?: string | null;
}): string {
  if (view.status === "delivered") return "Notify: delivered.";
  if (view.status === "pending" && view.attempts === 0) {
    return "Notify: pending…";
  }
  return NOTIFY_FAILED_RETRY;
}

export function noticeToneForNotifyStatus(
  status: QueueNotifyStatus,
): QueueNoticeTone {
  return status;
}
