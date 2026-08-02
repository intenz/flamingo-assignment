import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { expireStaleClaims } from "@/lib/triage/stale-claims";

/**
 * Manual / external cron sweep for stale claims (R5).
 * No Vercel daemon: list + claim also sweep; this endpoint is for ops / scheduled HTTP.
 * Scoped to the signed-in user's workspace when present; otherwise all workspaces.
 */
export async function POST() {
  const session = await getSessionUser();
  if (!session?.id) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in first." },
      { status: 401 },
    );
  }

  const result = await expireStaleClaims({
    workspaceId: session.workspaceId ?? undefined,
  });

  return NextResponse.json({
    ok: true,
    expiredCount: result.expiredCount,
    cutoff: result.cutoff.toISOString(),
    workspaceId: session.workspaceId ?? null,
  });
}
