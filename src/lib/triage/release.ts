import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { requireFreshClaimHolder } from "@/lib/triage/require-holder";

/** Holder returns the item to `open`. ACL + stale-claim gate in `requireFreshClaimHolder`. */
export async function releaseItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
) {
  await requireFreshClaimHolder(itemId, userId, "release", db);

  return db.item.update({
    where: { id: itemId },
    data: {
      status: "open",
      claimedById: null,
      claimedAt: null,
    },
  });
}
