import { prisma } from "@/lib/prisma";

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
 * Full keyset pagination arrives in R4 — for now we intentionally cap at N.
 */
export async function listItemsForWorkspace(
  workspaceId: string,
  take: number = QUEUE_PAGE_SIZE,
): Promise<QueueItemRow[]> {
  const items = await prisma.item.findMany({
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
