import { prisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";

/**
 * Stub resolve (pre-R3): marks claimed item resolved if held by actor.
 * Notify/outbox arrives in R3.
 */
export async function resolveItem(itemId: string, userId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new TriageError("not_found", "Item not found.");
  }
  if (item.status !== "claimed" || item.claimedById !== userId) {
    throw new TriageError(
      "invalid_state",
      "Only the current holder can resolve this item.",
    );
  }

  return prisma.item.update({
    where: { id: itemId },
    data: {
      status: "resolved",
      claimedById: null,
      claimedAt: null,
    },
  });
}
