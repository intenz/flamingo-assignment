import { NextResponse } from "next/server";
import { catchTriage, requireSessionUserId } from "@/lib/api/http";
import { drainOutboxEntry, getOutboxStatus } from "@/lib/triage/outbox";

type Params = { params: Promise<{ id: string }> };

/** Poll notify delivery status (workspace members only). */
export async function GET(_request: Request, { params }: Params) {
  const session = await requireSessionUserId();
  if ("response" in session) return session.response;

  const { id } = await params;

  try {
    const notify = await getOutboxStatus(id, session.userId);
    return NextResponse.json({ ok: true, notify });
  } catch (err) {
    return catchTriage(err);
  }
}

/** Re-drain one outbox row (Resolve-click retry). At-least-once OK. */
export async function POST(_request: Request, { params }: Params) {
  const session = await requireSessionUserId();
  if ("response" in session) return session.response;

  const { id } = await params;

  try {
    await getOutboxStatus(id, session.userId);
    await drainOutboxEntry(id);
    const notify = await getOutboxStatus(id, session.userId);
    return NextResponse.json({ ok: true, notify });
  } catch (err) {
    return catchTriage(err);
  }
}
