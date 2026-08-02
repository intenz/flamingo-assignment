import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { assertItemAccess } from "@/lib/triage/access";
import { TriageError } from "@/lib/triage/errors";

/**
 * Resolve: marks claimed item resolved if held by actor.
 * Notify/outbox arrives in R3. R2: workspace + mutate role sealed first.
 */
export async function resolveItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
) {
  const { item } = await assertItemAccess(
    userId,
    itemId,
    { mutate: true },
    db,
  );

  if (item.status !== "claimed" || item.claimedById !== userId) {
    throw new TriageError(
      "invalid_state",
      "Only the current holder can resolve this item.",
    );
  }

  return db.item.update({
    where: { id: itemId },
    data: {
      status: "resolved",
      claimedById: null,
      claimedAt: null,
    },
  });
}
