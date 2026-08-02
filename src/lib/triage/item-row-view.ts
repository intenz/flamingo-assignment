import type { QueueItemRow } from "@/lib/triage/list-items";

export type ItemRowState = {
  status: QueueItemRow["status"];
  claimedById: string | null;
  claimedByName: string | null;
};

export type ItemAction = "claim" | "resolve" | "release";

export type NoticeTone = "pending" | "delivered" | "failed" | "warning";

export type ActionNotice = {
  text: string;
  tone: NoticeTone;
};

export function formatCreatedAt(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function holderLabel(row: ItemRowState): string {
  if (row.status === "open") return "—";
  if (row.claimedByName) return row.claimedByName;
  if (row.claimedById) return row.claimedById;
  return "—";
}

const NOTIFY_FAILED_RETRY = "Notify failed. Click Resolve to retry.";

export function formatNotifyNotice(view: {
  status: "pending" | "delivered" | "failed";
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
  status: "pending" | "delivered" | "failed",
): NoticeTone {
  return status;
}
