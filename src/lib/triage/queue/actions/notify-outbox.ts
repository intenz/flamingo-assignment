import type { PrismaClient } from "@/generated/prisma/client";
import { assertWorkspaceMember } from "@/lib/auth/membership";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";
import { notify, type NotifyDeps } from "@/lib/triage/queue/actions/notify";
import type { QueueNotifyStatus } from "@/lib/triage/queue/queue-types";
import { NOTIFY_MAX_ATTEMPTS } from "@/lib/triage/queue/queue-constants";

export type NotifyDeliveryResult = {
  outboxId: string;
  status: Exclude<QueueNotifyStatus, "pending"> | "skipped";
  attempts: number;
  error?: string;
};

export type NotifyOutboxStatus = {
  outboxId: string;
  itemId: string;
  status: QueueNotifyStatus;
  attempts: number;
  lastError: string | null;
  deliveredAt: string | null;
};

/** Workspace members can poll delivery status for an outbox row. */
export async function getNotifyOutboxStatus(
  outboxId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<NotifyOutboxStatus> {
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
    deliveredAt: row.deliveredAt?.toISOString() ?? null,
  };
}

/**
 * One attempt to deliver a notify outbox row via flaky `notify()`.
 * At-least-once until `delivered`, or `failed` after NOTIFY_MAX_ATTEMPTS.
 */
export async function deliverNotifyOutbox(
  outboxId: string,
  db: PrismaClient = defaultPrisma,
  notifyDeps: NotifyDeps = {},
): Promise<NotifyDeliveryResult> {
  const row = await db.notifyOutbox.findUnique({ where: { id: outboxId } });
  if (!row) {
    return { outboxId, status: "skipped", attempts: 0, error: "not_found" };
  }
  if (row.status === "delivered") {
    return { outboxId, status: "skipped", attempts: row.attempts };
  }
  if (row.status === "failed" && row.attempts >= NOTIFY_MAX_ATTEMPTS) {
    return { outboxId, status: "skipped", attempts: row.attempts };
  }

  const attempts = row.attempts + 1;
  const payload = `Item ${row.itemId} notify`;

  try {
    await notify(payload, notifyDeps);
    await db.notifyOutbox.update({
      where: { id: outboxId },
      data: {
        status: "delivered",
        attempts,
        lastError: null,
        deliveredAt: new Date(),
      },
    });
    return { outboxId, status: "delivered", attempts };
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
 * Deliver up to `limit` pending (or retriable failed) outbox rows — oldest first.
 */
export async function deliverPendingNotifies(
  limit = 10,
  db: PrismaClient = defaultPrisma,
  notifyDeps: NotifyDeps = {},
): Promise<NotifyDeliveryResult[]> {
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

  const results: NotifyDeliveryResult[] = [];
  for (const row of rows) {
    results.push(await deliverNotifyOutbox(row.id, db, notifyDeps));
  }
  return results;
}
