import { prisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";

/** Stub release: holder returns item to open. */
export async function releaseItem(itemId: string, userId: string) {
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) {
    throw new TriageError("not_found", "Item not found.");
  }
  if (item.status !== "claimed" || item.claimedById !== userId) {
    throw new TriageError(
      "invalid_state",
      "Only the current holder can release this item.",
    );
  }

  return prisma.item.update({
    where: { id: itemId },
    data: {
      status: "open",
      claimedById: null,
      claimedAt: null,
    },
  });
}
