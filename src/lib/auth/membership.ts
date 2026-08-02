import type { Role, PrismaClient } from "@/generated/prisma/client";
import { prisma as defaultPrisma } from "@/lib/prisma";
import { TriageError } from "@/lib/triage/errors";

/** Default workspace for the assignment seed / single-tenant demo. */
export const DEFAULT_WORKSPACE_ID = "ws_flamingo";

export type MembershipInfo = {
  id: string;
  workspaceId: string;
  userId: string;
  role: Role;
};

/** Roles allowed to claim / resolve / release (R2). */
export function roleCanMutate(role: Role): boolean {
  return role === "owner" || role === "member";
}

export async function getMembership(
  userId: string,
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<MembershipInfo | null> {
  const row = await db.membership.findUnique({
    where: {
      workspaceId_userId: { workspaceId, userId },
    },
    select: {
      id: true,
      workspaceId: true,
      userId: true,
      role: true,
    },
  });
  return row;
}

/**
 * Require membership in the workspace (any role, including viewer).
 * Used for sealed reads in R2 — foreign users get forbidden, not the item.
 */
export async function assertWorkspaceMember(
  userId: string,
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<MembershipInfo> {
  const membership = await getMembership(userId, workspaceId, db);
  if (!membership) {
    throw new TriageError(
      "forbidden",
      "Not a member of this workspace.",
    );
  }
  return membership;
}

/**
 * Require owner/member — viewers are read-only (R2).
 * Call after (or with) workspace membership checks on mutation routes.
 */
export async function assertCanMutate(
  userId: string,
  workspaceId: string,
  db: PrismaClient = defaultPrisma,
): Promise<MembershipInfo> {
  const membership = await assertWorkspaceMember(userId, workspaceId, db);
  if (!roleCanMutate(membership.role)) {
    throw new TriageError(
      "forbidden",
      "Viewers can read the queue but cannot claim, resolve, or release.",
    );
  }
  return membership;
}
