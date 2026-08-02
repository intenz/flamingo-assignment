import type { PrismaClient } from "@/generated/prisma/client";
import { getMembership, roleCanMutate } from "@/lib/auth/membership";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { withTransientDbRetry } from "@/lib/triage/db-retry";
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
  workspaceId: string;
};

/**
 * R1 + R2: one conditional UPDATE joined to Membership (owner/member only).
 * No TOCTOU between ACL and claim; lost races return `already_claimed`.
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
    FROM "Membership" AS m
    WHERE i.id = ${itemId}
      AND i.status = 'open'
      AND m."workspaceId" = i."workspaceId"
      AND m."userId" = ${userId}
      AND m.role IN ('owner'::"MembershipRole", 'member'::"MembershipRole")
    RETURNING
      i.id,
      i.status,
      i."claimedById",
      i."workspaceId",
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

  // Read-only diagnose may retry on prisma-dev connection drops (never re-run UPDATE).
  return withTransientDbRetry(() => diagnoseLostClaim(db, itemId, userId));
}

async function diagnoseLostClaim(
  db: PrismaClient,
  itemId: string,
  userId: string,
): Promise<ClaimResult> {
  const current = await db.$queryRaw<ClaimRow[]>`
    SELECT
      i.id,
      i.status,
      i."claimedById",
      i."workspaceId",
      u.name AS "claimedByName"
    FROM "Item" AS i
    LEFT JOIN "User" AS u ON u.id = i."claimedById"
    WHERE i.id = ${itemId}
  `;

  if (current.length === 0) {
    throw new TriageError("not_found", "Item not found.");
  }

  const row = current[0]!;
  const membership = await getMembership(userId, row.workspaceId, db);
  if (!membership) {
    throw new TriageError("forbidden", "Not a member of this workspace.");
  }
  if (!roleCanMutate(membership.role)) {
    throw new TriageError(
      "forbidden",
      "Viewers can read the queue but cannot claim, resolve, or release.",
    );
  }

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
