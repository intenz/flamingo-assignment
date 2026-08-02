import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { assertItemAccess } from "@/lib/triage/access";
import { TriageError } from "@/lib/triage/errors";

export type ResolveResult = {
  item: {
    id: string;
    status: "resolved";
    /** Who resolved — kept on the row for Holder display. */
    claimedById: string;
    claimedByName: string | null;
  };
  /** Outbox row created in the same transaction — notify is drained after response. */
  notify: {
    outboxId: string;
    status: "pending";
    message: string;
  };
};

function newOutboxId(): string {
  return `out_${randomBytes(10).toString("hex")}`;
}

/**
 * Resolve: marks claimed item resolved + durable notify outbox (same TX).
 * Keeps `claimedById` as the resolver for Holder UI (not cleared).
 * Does not call flaky `notify()` — that is drain's job (R3 / serverless).
 */
export async function resolveItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ResolveResult> {
  const { item } = await assertItemAccess(
    userId,
    itemId,
    { mutate: true },
    db,
  );

  if (item.status !== "claimed" || item.claimedById !== userId) {
    throw new TriageError(
      "invalid_state",
      "Only the current holder can resolve this item.",
    );
  }

  const resolver = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  const claimedByName = resolver?.name ?? null;
  const message = `Item ${itemId} resolved by ${userId}`;
  const outboxId = newOutboxId();

  // Keep claimedById = resolver; clear claimedAt (no longer an active claim).
  await db.$transaction([
    db.item.update({
      where: { id: itemId },
      data: {
        status: "resolved",
        claimedById: userId,
        claimedAt: null,
      },
    }),
    db.notifyOutbox.create({
      data: {
        id: outboxId,
        itemId,
        message,
        status: "pending",
      },
    }),
  ]);

  return {
    item: {
      id: itemId,
      status: "resolved",
      claimedById: userId,
      claimedByName,
    },
    notify: { outboxId, status: "pending", message },
  };
}
