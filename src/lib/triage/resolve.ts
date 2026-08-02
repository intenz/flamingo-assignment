import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { assertItemAccess } from "@/lib/triage/access";
import { TriageError } from "@/lib/triage/errors";
import {
  CLAIM_TTL_MS,
  CLAIM_EXPIRED_MESSAGE,
  expireStaleClaimById,
  isClaimFresh,
} from "@/lib/triage/stale-claims";

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
 *
 * R5: a claim past the 30m TTL is expired first; resolve then fails with
 * `invalid_state` + CLAIM_EXPIRED_MESSAGE (item is open again).
 */
export async function resolveItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ResolveResult> {
  await assertItemAccess(userId, itemId, { mutate: true }, db);

  const expiredNow = await expireStaleClaimById(itemId, { db });
  if (expiredNow) {
    throw new TriageError("invalid_state", CLAIM_EXPIRED_MESSAGE);
  }

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

  if (!isClaimFresh(item.claimedAt)) {
    await expireStaleClaimById(itemId, { db });
    throw new TriageError("invalid_state", CLAIM_EXPIRED_MESSAGE);
  }

  const resolver = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  const claimedByName = resolver?.name ?? null;
  const message = `Item ${itemId} resolved by ${userId}`;
  const outboxId = newOutboxId();
  const cutoff = new Date(Date.now() - CLAIM_TTL_MS);

  try {
    await db.$transaction(async (tx) => {
      const updated = await tx.item.updateMany({
        where: {
          id: itemId,
          status: "claimed",
          claimedById: userId,
          claimedAt: { gte: cutoff },
        },
        data: {
          status: "resolved",
          claimedById: userId,
          claimedAt: null,
        },
      });

      if (updated.count !== 1) {
        throw new TriageError("invalid_state", CLAIM_EXPIRED_MESSAGE);
      }

      await tx.notifyOutbox.create({
        data: {
          id: outboxId,
          itemId,
          message,
          status: "pending",
        },
      });
    });
  } catch (err) {
    if (err instanceof TriageError && err.message === CLAIM_EXPIRED_MESSAGE) {
      await expireStaleClaimById(itemId, { db });
    }
    throw err;
  }

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
