import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { expireStaleClaims } from "@/lib/triage/stale-claims";

const MAX_IDS = 100;

/**
 * Re-read visible queue rows after a workspace stale-claim sweep (R5).
 * Client polls this while claimed items are on screen — expiry stays server-side.
 * Query: `ids=itm_a,itm_b` (workspace members only; foreign ids omitted).
 */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session?.id || !session.workspaceId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in first." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const ids = (url.searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return NextResponse.json({ items: [] });
  }
  if (ids.length > MAX_IDS) {
    return NextResponse.json(
      { error: "invalid_state", message: `At most ${MAX_IDS} ids.` },
      { status: 400 },
    );
  }

  // Source of truth: sweep on the server, then return current row state.
  await expireStaleClaims({ workspaceId: session.workspaceId });

  const rows = await prisma.item.findMany({
    where: {
      workspaceId: session.workspaceId,
      id: { in: ids },
    },
    include: {
      claimedBy: { select: { id: true, name: true } },
      notifyOutbox: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          attempts: true,
          lastError: true,
        },
      },
    },
  });

  return NextResponse.json({
    items: rows.map((item) => {
      const latest = item.notifyOutbox[0] ?? null;
      const notify =
        latest && latest.status !== "sent"
          ? {
              outboxId: latest.id,
              status: latest.status,
              attempts: latest.attempts,
              lastError: latest.lastError,
            }
          : null;

      return {
        id: item.id,
        status: item.status,
        claimedById: item.claimedById,
        claimedByName: item.claimedBy?.name ?? null,
        notify,
      };
    }),
  });
}
