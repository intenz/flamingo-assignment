import type { PrismaClient } from "@/generated/prisma/client";
import { assertWorkspaceMember } from "@/lib/auth/membership";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";
import { expireStaleClaims } from "@/lib/triage/stale-claims";

export const QUEUE_PAGE_SIZE = 50;

/** Latest outbox for UI hydrate after refresh (null if none / already sent). */
export type QueueItemNotify = {
  outboxId: string;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  lastError: string | null;
};

export type QueueItemRow = {
  id: string;
  title: string;
  status: "open" | "claimed" | "resolved";
  claimedById: string | null;
  claimedByName: string | null;
  createdAt: Date;
  /** Present when notify still needs attention (pending/failed). */
  notify: QueueItemNotify | null;
};

export type QueuePage = {
  items: QueueItemRow[];
  /**
   * Id of the last row on this page — pass as `after` for the next older page.
   * Null when there are no more older items.
   */
  nextAfterId: string | null;
};

export type ListItemsOptions = {
  take?: number;
  /** Continue with items older than this id (newest-first keyset). */
  after?: string | null;
  db?: PrismaClient;
};

/**
 * Workspace queue page — newest first, keyset on (createdAt, id).
 * Client passes the last seen item id as `after`; server resolves createdAt.
 * Stable under inserts/deletes ahead of the cursor (unlike OFFSET).
 */
export async function listItemsForWorkspace(
  workspaceId: string,
  userId: string,
  options: ListItemsOptions = {},
): Promise<QueuePage> {
  const take = options.take ?? QUEUE_PAGE_SIZE;
  const db = options.db ?? defaultPrisma;
  const afterId = options.after?.trim() || null;

  await assertWorkspaceMember(userId, workspaceId, db);

  // R5: no Vercel daemon — list traffic sweeps this workspace's stale claims.
  await expireStaleClaims({ workspaceId, db });

  let cursor: { createdAt: Date; id: string } | null = null;
  if (afterId) {
    const anchor = await db.item.findFirst({
      where: { id: afterId, workspaceId },
      select: { id: true, createdAt: true },
    });
    if (!anchor) {
      throw new TriageError(
        "not_found",
        "after item not found in this workspace.",
      );
    }
    cursor = { createdAt: anchor.createdAt, id: anchor.id };
  }

  const items = await db.item.findMany({
    where: {
      workspaceId,
      ...(cursor
        ? {
            OR: [
              { createdAt: { lt: cursor.createdAt } },
              {
                createdAt: cursor.createdAt,
                id: { lt: cursor.id },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
    include: {
      claimedBy: { select: { id: true, name: true } },
      notifyOutbox: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          attempts: true,
          lastError: true,
        },
      },
    },
  });

  const hasMore = items.length > take;
  const page = hasMore ? items.slice(0, take) : items;
  const last = page[page.length - 1];

  return {
    items: page.map((item) => {
      const latest = item.notifyOutbox[0] ?? null;
      // Only surface undelivered notify — sent rows don't need a post-refresh banner.
      const notify =
        latest && latest.status !== "delivered"
          ? {
              outboxId: latest.id,
              status: latest.status,
              attempts: latest.attempts,
              lastError: latest.lastError,
            }
          : null;

      return {
        id: item.id,
        title: item.title,
        status: item.status,
        claimedById: item.claimedById,
        claimedByName: item.claimedBy?.name ?? null,
        createdAt: item.createdAt,
        notify,
      };
    }),
    nextAfterId: hasMore && last ? last.id : null,
  };
}
