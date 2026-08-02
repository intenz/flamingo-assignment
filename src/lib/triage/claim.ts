import type { PrismaClient } from "@/generated/prisma/client";
import { getMembership, roleCanMutate } from "@/lib/auth/membership";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { withTransientDbRetry } from "@/lib/triage/db-retry";
import { TriageError } from "@/lib/triage/errors";
import { expireStaleClaimById } from "@/lib/triage/stale-claims";

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
 * Claim an open item (R1) with ACL inside the same UPDATE (R2).
 * Lost races → `already_claimed` (not thrown). Stale holders cleared first (R5).
 */
export async function claimItem(
  itemId: string,
  userId: string,
  db: PrismaClient = defaultPrisma,
): Promise<ClaimResult> {
  await expireStaleClaimById(itemId, { db });

  const won = await tryWinClaim(db, itemId, userId);
  if (won) return won;

  // Read-only diagnose may retry on transient DB drops (never re-run UPDATE).
  return withTransientDbRetry(() => diagnoseLostClaim(db, itemId, userId));
}

async function tryWinClaim(
  db: PrismaClient,
  itemId: string,
  userId: string,
): Promise<Extract<ClaimResult, { outcome: "won" }> | null> {
  const rows = await db.$queryRaw<ClaimRow[]>`
    UPDATE items AS i
    SET
      status = 'claimed',
      claimed_by_id = ${userId},
      claimed_at = NOW(),
      updated_at = NOW()
    FROM memberships AS m
    WHERE i.id = ${itemId}
      AND i.status = 'open'
      AND m.workspace_id = i.workspace_id
      AND m.user_id = ${userId}
      AND m.role IN ('owner'::"Role", 'member'::"Role")
    RETURNING
      i.id,
      i.status,
      i.claimed_by_id AS "claimedById",
      i.workspace_id AS "workspaceId",
      (SELECT u.name FROM users AS u WHERE u.id = ${userId}) AS "claimedByName"
  `;

  if (rows.length !== 1) return null;
  const row = rows[0]!;
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

async function diagnoseLostClaim(
  db: PrismaClient,
  itemId: string,
  userId: string,
): Promise<ClaimResult> {
  const current = await db.$queryRaw<ClaimRow[]>`
    SELECT
      i.id,
      i.status,
      i.claimed_by_id AS "claimedById",
      i.workspace_id AS "workspaceId",
      u.name AS "claimedByName"
    FROM items AS i
    LEFT JOIN users AS u ON u.id = i.claimed_by_id
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
