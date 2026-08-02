import type { QueueItemRow } from "@/lib/triage/list-items";

export type ItemRowState = {
  status: QueueItemRow["status"];
  claimedById: string | null;
  claimedByName: string | null;
};

export type ItemAction = "claim" | "resolve" | "release";

export function formatCreatedAt(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function holderLabel(row: ItemRowState): string {
  if (row.status === "open") return "—";
  // Claimed → current holder; resolved → who resolved (we keep claimedById on resolve).
  if (row.claimedByName) return row.claimedByName;
  if (row.claimedById) return row.claimedById;
  return "—";
}

export function claimTooltip(
  row: ItemRowState,
  canClaim: boolean,
  claimHint: string | null,
): string {
  if (claimHint) return claimHint;
  if (canClaim) return "Claim: take this item so others cannot work it.";
  if (row.status === "claimed") {
    return `Claim unavailable: already held by ${holderLabel(row)}.`;
  }
  if (row.status === "resolved") {
    return "Claim unavailable: item is already resolved.";
  }
  return "Claim unavailable.";
}

export function resolveTooltip(isHolder: boolean): string {
  return isHolder
    ? "Resolve: mark this item done."
    : "Resolve unavailable: only the current holder can resolve.";
}

export function releaseTooltip(isHolder: boolean): string {
  return isHolder
    ? "Release: return this item to the open queue."
    : "Release unavailable: only the current holder can release.";
}

const NOTIFY_FAILED_RETRY =
  "Notify failed. Click Resolve to retry.";

export function formatNotifyNotice(view: {
  status: "pending" | "sent" | "failed";
  attempts: number;
  lastError?: string | null;
}): string {
  if (view.status === "sent") {
    return "Notify: delivered.";
  }
  if (view.status === "pending" && view.attempts === 0) {
    return "Notify: pending…";
  }
  // pending with attempts > 0, or terminal failed
  return NOTIFY_FAILED_RETRY;
}

export type NoticeTone = "pending" | "sent" | "failed" | "warning";

export type ActionNotice = {
  text: string;
  tone: NoticeTone;
};

export function noticeToneForNotifyStatus(
  status: "pending" | "sent" | "failed",
): NoticeTone {
  return status;
}
