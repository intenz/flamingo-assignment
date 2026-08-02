import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { CLAIM_TTL_MS, CLAIM_EXPIRED_MESSAGE } from "@/lib/triage/claim-constants";
import { TriageError } from "@/lib/triage/errors";
import { requireFreshClaimHolder } from "@/lib/triage/require-holder";
import { expireStaleClaimById } from "@/lib/triage/stale-claims";

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
 * Mark claimed → resolved and write a pending `NotifyOutbox` in one TX.
 * Does not call flaky `notify()` (see `drainOutboxEntry` / R3).
 */
export async function resolveItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ResolveResult> {
  await requireFreshClaimHolder(itemId, userId, "resolve", db);

  const resolver = await db.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  const outboxId = newOutboxId();
  const cutoff = new Date(Date.now() - CLAIM_TTL_MS);

  try {
    await db.$transaction(async (tx) => {
      // Conditional write: still claimed by us and within TTL (race-safe vs R5).
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
        data: { id: outboxId, itemId, status: "pending" },
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
      claimedByName: resolver?.name ?? null,
    },
    notify: {
      outboxId,
      status: "pending",
      message: `Item ${itemId} resolved by ${userId}`,
    },
  };
}
