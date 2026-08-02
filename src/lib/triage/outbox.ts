import type { PrismaClient } from "@/generated/prisma/client";
import { assertWorkspaceMember } from "@/lib/auth/membership";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";
import { notify, type NotifyDeps } from "@/lib/triage/notify";

/** Stop retrying after this many failed notify attempts (row stays `failed`). */
export const NOTIFY_MAX_ATTEMPTS = 8;

export type DrainResult = {
  outboxId: string;
  status: "sent" | "failed" | "skipped";
  attempts: number;
  error?: string;
};

export type OutboxStatusView = {
  outboxId: string;
  itemId: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  lastError: string | null;
  sentAt: string | null;
};

/** Workspace members can poll delivery status for an outbox row. */
export async function getOutboxStatus(
  outboxId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<OutboxStatusView> {
  const row = await db.notifyOutbox.findUnique({
    where: { id: outboxId },
    include: { item: { select: { workspaceId: true } } },
  });
  if (!row) {
    throw new TriageError("not_found", "Notify outbox entry not found.");
  }
  await assertWorkspaceMember(userId, row.item.workspaceId, db);

  return {
    outboxId: row.id,
    itemId: row.itemId,
    status: row.status,
    attempts: row.attempts,
    lastError: row.lastError,
    sentAt: row.sentAt?.toISOString() ?? null,
  };
}

/**
 * Attempt to deliver one outbox row via flaky `notify()`.
 * At-least-once until `sent`, or `failed` after NOTIFY_MAX_ATTEMPTS.
 */
export async function drainOutboxEntry(
  outboxId: string,
  db: PrismaClient = defaultPrisma,
  notifyDeps: NotifyDeps = {},
): Promise<DrainResult> {
  const row = await db.notifyOutbox.findUnique({ where: { id: outboxId } });
  if (!row) {
    return { outboxId, status: "skipped", attempts: 0, error: "not_found" };
  }
  if (row.status === "sent") {
    return { outboxId, status: "skipped", attempts: row.attempts };
  }
  if (row.status === "failed" && row.attempts >= NOTIFY_MAX_ATTEMPTS) {
    return { outboxId, status: "skipped", attempts: row.attempts };
  }

  const attempts = row.attempts + 1;

  try {
    await notify(row.message, notifyDeps);
    await db.notifyOutbox.update({
      where: { id: outboxId },
      data: {
        status: "sent",
        attempts,
        lastError: null,
        sentAt: new Date(),
      },
    });
    return { outboxId, status: "sent", attempts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = attempts >= NOTIFY_MAX_ATTEMPTS ? "failed" : "pending";
    await db.notifyOutbox.update({
      where: { id: outboxId },
      data: {
        status,
        attempts,
        lastError: message,
      },
    });
    return {
      outboxId,
      status: "failed",
      attempts,
      error: message,
    };
  }
}

/**
 * Drain up to `limit` pending (or retriable failed) outbox rows — oldest first.
 */
export async function drainOutboxBatch(
  limit = 10,
  db: PrismaClient = defaultPrisma,
  notifyDeps: NotifyDeps = {},
): Promise<DrainResult[]> {
  const rows = await db.notifyOutbox.findMany({
    where: {
      OR: [
        { status: "pending" },
        { status: "failed", attempts: { lt: NOTIFY_MAX_ATTEMPTS } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true },
  });

  const results: DrainResult[] = [];
  for (const row of rows) {
    results.push(await drainOutboxEntry(row.id, db, notifyDeps));
  }
  return results;
}
