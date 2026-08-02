import type { PrismaClient } from "@/generated/prisma/client";
import { assertWorkspaceMember } from "@/lib/auth/membership";
import { prisma as defaultPrisma } from "@/lib/prisma";

export const QUEUE_PAGE_SIZE = 50;

export type QueueItemRow = {
  id: string;
  title: string;
  status: "open" | "claimed" | "resolved";
  claimedById: string | null;
  claimedByName: string | null;
  createdAt: Date;
};

/**
 * First page of the workspace queue (newest first).
 * R2: caller must be a member — list never spans workspaces.
 * Full keyset pagination arrives in R4 — for now we intentionally cap at N.
 */
export async function listItemsForWorkspace(
  workspaceId: string,
  userId: string,
  take: number = QUEUE_PAGE_SIZE,
  db: PrismaClient = defaultPrisma,
): Promise<QueueItemRow[]> {
  await assertWorkspaceMember(userId, workspaceId, db);

  const items = await db.item.findMany({
    where: { workspaceId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
    include: {
      claimedBy: { select: { id: true, name: true } },
    },
  });

  return items.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    claimedById: item.claimedById,
    claimedByName: item.claimedBy?.name ?? null,
    createdAt: item.createdAt,
  }));
}
