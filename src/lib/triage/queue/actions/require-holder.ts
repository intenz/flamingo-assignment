import type { Item, PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { requireItemAccess } from "@/lib/triage/queue/actions/require-item-access";
import { CLAIM_EXPIRED_MESSAGE } from "@/lib/triage/queue/queue-constants";
import { TriageError } from "@/lib/triage/errors";
import {
  reopenStaleClaimById,
  isClaimFresh,
} from "@/lib/triage/queue/actions/reopen-stale-claims";

export type HolderItem = Pick<
  Item,
  "id" | "workspaceId" | "status" | "claimedById" | "claimedAt"
>;

/**
 * Shared gate for resolve / release:
 * 1. R2 — member who can mutate
 * 2. R5 — expire stale claim in place if needed
 * 3. Caller must be the current holder
 */
export async function requireFreshClaimHolder(
  itemId: string,
  userId: string,
  action: "resolve" | "release",
  db: PrismaClient = defaultPrisma,
): Promise<HolderItem> {
  const { item } = await requireItemAccess(
    userId,
    itemId,
    { mutate: true },
    db,
  );

  if (item.status === "claimed" && !isClaimFresh(item.claimedAt)) {
    await reopenStaleClaimById(itemId, { db });
    throw new TriageError("invalid_state", CLAIM_EXPIRED_MESSAGE);
  }

  if (item.status !== "claimed" || item.claimedById !== userId) {
    throw new TriageError(
      "invalid_state",
      `Only the current holder can ${action} this item.`,
    );
  }

  return item;
}
