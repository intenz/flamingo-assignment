import { prisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";

/**
 * Stub claim (pre-R1): assigns the item if currently open.
 * Not yet race-safe under concurrent writers — R1 replaces this with a
 * single conditional UPDATE.
 */
export async function claimItem(itemId: string, userId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new TriageError("not_found", "Item not found.");
  }
  if (item.status !== "open") {
    throw new TriageError(
      "invalid_state",
      item.claimedById
        ? `Item already ${item.status} by ${item.claimedById}.`
        : `Item is ${item.status}.`,
    );
  }

  return prisma.item.update({
    where: { id: itemId },
    data: {
      status: "claimed",
      claimedById: userId,
      claimedAt: new Date(),
    },
    include: { claimedBy: { select: { id: true, name: true } } },
  });
}
