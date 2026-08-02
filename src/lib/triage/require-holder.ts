import type { Item, PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { assertItemAccess } from "@/lib/triage/access";
import { CLAIM_EXPIRED_MESSAGE } from "@/lib/triage/claim-constants";
import { TriageError } from "@/lib/triage/errors";
import {
  expireStaleClaimById,
  isClaimFresh,
} from "@/lib/triage/stale-claims";

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
  const { item } = await assertItemAccess(
    userId,
    itemId,
    { mutate: true },
    db,
  );

  if (item.status === "claimed" && !isClaimFresh(item.claimedAt)) {
    await expireStaleClaimById(itemId, { db });
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
