import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { assertItemAccess } from "@/lib/triage/access";
import { TriageError } from "@/lib/triage/errors";
import { CLAIM_EXPIRED_MESSAGE } from "@/lib/triage/claim-constants";
import { expireStaleClaimById } from "@/lib/triage/stale-claims";

/** Release: holder returns item to open. R2: workspace + mutate role sealed first.
 * R5: expire stale claim first — then reject if this call (or TTL) opened it. */
export async function releaseItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
) {
  await assertItemAccess(userId, itemId, { mutate: true }, db);
  const didExpire = await expireStaleClaimById(itemId, { db });
  if (didExpire) {
    throw new TriageError("invalid_state", CLAIM_EXPIRED_MESSAGE);
  }

  const { item } = await assertItemAccess(
    userId,
    itemId,
    { mutate: true },
    db,
  );

  if (item.status !== "claimed" || item.claimedById !== userId) {
    throw new TriageError(
      "invalid_state",
      "Only the current holder can release this item.",
    );
  }

  return db.item.update({
    where: { id: itemId },
    data: {
      status: "open",
      claimedById: null,
      claimedAt: null,
    },
  });
}
