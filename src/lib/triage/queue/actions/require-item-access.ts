import type { Item, PrismaClient } from "@/generated/prisma/client";
import {
  assertCanMutate,
  assertWorkspaceMember,
  type MembershipInfo,
} from "@/lib/auth/membership";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";

export type ItemAccess = {
  item: Pick<Item, "id" | "workspaceId" | "status" | "claimedById" | "claimedAt">;
  membership: MembershipInfo;
};

/**
 * R2 seal: every item mutation/read-by-id goes through here.
 * Load item → require workspace membership → optional mutate role.
 * Cross-workspace IDs get `forbidden` (403), not a leaky 404 for “exists elsewhere”.
 */
export async function requireItemAccess(
  userId: string,
  itemId: string,
  options: { mutate: boolean },
  db: PrismaClient = defaultPrisma,
): Promise<ItemAccess> {
  const item = await db.item.findUnique({
    where: { id: itemId },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      claimedById: true,
      claimedAt: true,
    },
  });

  if (!item) {
    throw new TriageError("not_found", "Item not found.");
  }

  const membership = options.mutate
    ? await assertCanMutate(userId, item.workspaceId, db)
    : await assertWorkspaceMember(userId, item.workspaceId, db);

  return { item, membership };
}
