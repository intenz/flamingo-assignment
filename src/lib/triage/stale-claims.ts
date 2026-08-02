import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import {
  CLAIM_EXPIRED_MESSAGE,
  CLAIM_TTL_MS,
} from "@/lib/triage/claim-constants";

export { CLAIM_EXPIRED_MESSAGE, CLAIM_TTL_MS } from "@/lib/triage/claim-constants";

export type ExpireStaleClaimsOptions = {
  /** Limit sweep to one workspace (list / session sweep). */
  workspaceId?: string;
  /** Injectible clock for tests. */
  now?: Date;
  db?: PrismaClient;
};

export type ExpireStaleClaimsResult = {
  expiredCount: number;
  /** Cutoff used: claims with claimedAt strictly before this are stale. */
  cutoff: Date;
};

/** True when claimedAt is still within the 30m TTL. */
export function isClaimFresh(
  claimedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!claimedAt) return false;
  return claimedAt.getTime() > now.getTime() - CLAIM_TTL_MS;
}

function cutoffFor(now: Date): Date {
  return new Date(now.getTime() - CLAIM_TTL_MS);
}

/**
 * Return stale claims to the open queue.
 * Atomic per-row via updateMany; safe to call from list/claim/cron without a daemon.
 */
export async function expireStaleClaims(
  options: ExpireStaleClaimsOptions = {},
): Promise<ExpireStaleClaimsResult> {
  const db = options.db ?? defaultPrisma;
  const now = options.now ?? new Date();
  const cutoff = cutoffFor(now);

  const result = await db.item.updateMany({
    where: {
      status: "claimed",
      claimedAt: { lt: cutoff },
      ...(options.workspaceId ? { workspaceId: options.workspaceId } : {}),
    },
    data: {
      status: "open",
      claimedById: null,
      claimedAt: null,
    },
  });

  return { expiredCount: result.count, cutoff };
}

/**
 * Expire one item if its claim is past TTL (claim/resolve paths).
 * Returns true when this call flipped the row to open.
 */
export async function expireStaleClaimById(
  itemId: string,
  options: { now?: Date; db?: PrismaClient } = {},
): Promise<boolean> {
  const db = options.db ?? defaultPrisma;
  const now = options.now ?? new Date();
  const cutoff = cutoffFor(now);

  const result = await db.item.updateMany({
    where: {
      id: itemId,
      status: "claimed",
      claimedAt: { lt: cutoff },
    },
    data: {
      status: "open",
      claimedById: null,
      claimedAt: null,
    },
  });

  return result.count === 1;
}
