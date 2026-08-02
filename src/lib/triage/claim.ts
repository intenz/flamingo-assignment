import type { PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";

export type ClaimHolder = {
  id: string;
  name: string | null;
};

export type ClaimResult =
  | {
      outcome: "won";
      item: {
        id: string;
        status: "claimed";
        claimedById: string;
        claimedByName: string | null;
      };
    }
  | {
      /** Not an error — another member already holds the item. */
      outcome: "already_claimed";
      item: {
        id: string;
        status: "claimed" | "resolved" | "open";
        claimedById: string | null;
        claimedByName: string | null;
      };
      holder: ClaimHolder | null;
      message: string;
    };

type ClaimRow = {
  id: string;
  status: "open" | "claimed" | "resolved";
  claimedById: string | null;
  claimedByName: string | null;
};

/**
 * R1: exactly one winner under concurrency.
 * One conditional `UPDATE … WHERE status = 'open' RETURNING` — no TOCTOU gap.
 * Lost races return `already_claimed` (informative), not a thrown error.
 */
export async function claimItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ClaimResult> {
  const won = await db.$queryRaw<ClaimRow[]>`
    UPDATE "Item" AS i
    SET
      status = 'claimed',
      "claimedById" = ${userId},
      "claimedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE i.id = ${itemId}
      AND i.status = 'open'
    RETURNING
      i.id,
      i.status,
      i."claimedById",
      (SELECT u.name FROM "User" AS u WHERE u.id = ${userId}) AS "claimedByName"
  `;

  if (won.length === 1) {
    const row = won[0]!;
    return {
      outcome: "won",
      item: {
        id: row.id,
        status: "claimed",
        claimedById: userId,
        claimedByName: row.claimedByName,
      },
    };
  }

  const current = await db.$queryRaw<ClaimRow[]>`
    SELECT
      i.id,
      i.status,
      i."claimedById",
      u.name AS "claimedByName"
    FROM "Item" AS i
    LEFT JOIN "User" AS u ON u.id = i."claimedById"
    WHERE i.id = ${itemId}
  `;

  if (current.length === 0) {
    throw new TriageError("not_found", "Item not found.");
  }

  const row = current[0]!;
  const holder = row.claimedById
    ? { id: row.claimedById, name: row.claimedByName }
    : null;
  const who = holder?.name ?? holder?.id ?? "someone else";

  return {
    outcome: "already_claimed",
    item: {
      id: row.id,
      status: row.status,
      claimedById: row.claimedById,
      claimedByName: row.claimedByName,
    },
    holder,
    message: `Already claimed by ${who}.`,
  };
}
