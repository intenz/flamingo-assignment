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
  if (row.claimedByName) return row.claimedByName;
  if (row.claimedById) return row.claimedById;
  return "unknown";
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
