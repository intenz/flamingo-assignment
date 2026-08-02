/** Shared queue constants + small helpers that depend on them (no Prisma). */

/** Newest-first page size for list / load-more (R4). */
export const QUEUE_PAGE_SIZE = 50;

/** Active claims older than this return to `open` (R5). */
export const CLAIM_TTL_MS = 30 * 60 * 1000;

/** Shown when resolve/release hits a claim past the TTL. */
export const CLAIM_EXPIRED_MESSAGE =
  "Claim expired; item returned to the open queue.";

/** Soft copy when the claim timestamp is past TTL — status still `claimed` until server sweeps. */
export const STALE_CLAIM_HINT =
  "Claim past 30m — next list/claim/resolve will return it to open.";

/** Stop retrying after this many failed notify attempts (row stays `failed`). */
export const NOTIFY_MAX_ATTEMPTS = 8;

/** Client copy when notify is failed / exhausted retries. */
export const NOTIFY_FAILED_RETRY =
  "Notify failed. Click Resolve to retry.";

/** Outbox poll interval after resolve (client). */
export const NOTIFY_POLL_MS = 500;

/** Max poll ticks before the client stops waiting for delivery. */
export const NOTIFY_POLL_MAX = 8;

/** How long the “delivered” banner stays visible. */
export const NOTIFY_DELIVERED_HIDE_MS = 2500;

/** True when claimedAt is older than the 30m TTL (display / domain checks). */
export function claimLooksStale(
  claimedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!claimedAt) return false;
  return claimedAt.getTime() <= now.getTime() - CLAIM_TTL_MS;
}
