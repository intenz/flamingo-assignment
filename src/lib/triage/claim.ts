import { prisma } from "@/lib/prisma";
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

/**
 * R1: exactly one winner under concurrency.
 * Single conditional UPDATE — if count is 0, someone else claimed (or state changed).
 * Lost races return `already_claimed` (informative), not a thrown error.
 */
export async function claimItem(
  itemId: string,
  userId: string,
): Promise<ClaimResult> {
  const existing = await prisma.item.findUnique({
    where: { id: itemId },
    include: { claimedBy: { select: { id: true, name: true } } },
  });
  if (!existing) {
    throw new TriageError("not_found", "Item not found.");
  }

  const updated = await prisma.item.updateMany({
    where: { id: itemId, status: "open" },
    data: {
      status: "claimed",
      claimedById: userId,
      claimedAt: new Date(),
    },
  });

  if (updated.count === 1) {
    const holder = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });
    return {
      outcome: "won",
      item: {
        id: itemId,
        status: "claimed",
        claimedById: userId,
        claimedByName: holder?.name ?? null,
      },
    };
  }

  // Lost race or already non-open — re-read current state for the UI.
  const current = await prisma.item.findUnique({
    where: { id: itemId },
    include: { claimedBy: { select: { id: true, name: true } } },
  });
  if (!current) {
    throw new TriageError("not_found", "Item not found.");
  }

  const holder = current.claimedBy
    ? { id: current.claimedBy.id, name: current.claimedBy.name }
    : current.claimedById
      ? { id: current.claimedById, name: null }
      : null;

  const who = holder?.name ?? holder?.id ?? "someone else";
  return {
    outcome: "already_claimed",
    item: {
      id: current.id,
      status: current.status,
      claimedById: current.claimedById,
      claimedByName: holder?.name ?? null,
    },
    holder,
    message: `Already claimed by ${who}.`,
  };
}
