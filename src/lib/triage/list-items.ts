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

export type QueueCursor = {
  createdAt: Date;
  id: string;
};

export type QueuePage = {
  items: QueueItemRow[];
  /** Opaque keyset cursor for the next older page; null if no more. */
  nextCursor: string | null;
};

/** Encode (createdAt, id) for newest-first keyset pagination. */
export function encodeQueueCursor(createdAt: Date, id: string): string {
  return Buffer.from(
    `${createdAt.toISOString()}\n${id}`,
    "utf8",
  ).toString("base64url");
}

/** Decode cursor; returns null if malformed. */
export function decodeQueueCursor(raw: string | null | undefined): QueueCursor | null {
  if (!raw) return null;
  try {
    const text = Buffer.from(raw, "base64url").toString("utf8");
    const nl = text.indexOf("\n");
    if (nl <= 0) return null;
    const iso = text.slice(0, nl);
    const id = text.slice(nl + 1);
    const createdAt = new Date(iso);
    if (!id || Number.isNaN(createdAt.getTime())) return null;
    return { createdAt, id };
  } catch {
    return null;
  }
}

export type ListItemsOptions = {
  take?: number;
  /** Opaque cursor from a previous page's `nextCursor`. */
  cursor?: string | null;
  db?: PrismaClient;
};

/**
 * Workspace queue page — newest first, keyset on (createdAt, id).
 * Stable under inserts/deletes ahead of the cursor (unlike OFFSET).
 */
export async function listItemsForWorkspace(
  workspaceId: string,
  userId: string,
  options: ListItemsOptions = {},
): Promise<QueuePage> {
  const take = options.take ?? QUEUE_PAGE_SIZE;
  const db = options.db ?? defaultPrisma;
  const cursor = decodeQueueCursor(options.cursor ?? null);

  await assertWorkspaceMember(userId, workspaceId, db);

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
    },
  });

  const hasMore = items.length > take;
  const page = hasMore ? items.slice(0, take) : items;
  const last = page[page.length - 1];

  return {
    items: page.map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      claimedById: item.claimedById,
      claimedByName: item.claimedBy?.name ?? null,
      createdAt: item.createdAt,
    })),
    nextCursor: hasMore && last
      ? encodeQueueCursor(last.createdAt, last.id)
      : null,
  };
}
