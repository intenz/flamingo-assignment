import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { reopenStaleClaims } from "@/lib/triage/queue/actions/reopen-stale-claims";

/**
 * Manual / external cron for stale claims (R5).
 * No Vercel daemon: list + claim also reopen stale rows; this is for ops / scheduled HTTP.
 * Scoped to the signed-in user's workspace when present.
 */
export async function POST() {
  const session = await getSessionUser();
  if (!session?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in first." },
      { status: 401 },
    );
  }

  const result = await reopenStaleClaims({
    workspaceId: session.workspaceId ?? undefined,
  });

  return NextResponse.json({
    ok: true,
    reopenedCount: result.reopenedCount,
    cutoff: result.cutoff.toISOString(),
    workspaceId: session.workspaceId ?? null,
  });
}
