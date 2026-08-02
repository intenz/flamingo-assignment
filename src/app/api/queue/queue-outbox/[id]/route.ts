import { NextResponse } from "next/server";
import { triageErrorResponse, requireSessionUserId } from "@/lib/api/http";
import {
  deliverNotifyOutbox,
  getNotifyOutboxStatus,
} from "@/lib/triage/queue/actions/notify-outbox";

type Params = { params: Promise<{ id: string }> };

/** Poll notify delivery status (workspace members only). */
export async function GET(_request: Request, { params }: Params) {
  const session = await requireSessionUserId();
  if ("response" in session) return session.response;

  const { id } = await params;

  try {
    const notify = await getNotifyOutboxStatus(id, session.userId);
    return NextResponse.json({ ok: true, notify });
  } catch (err) {
    return triageErrorResponse(err);
  }
}

/** Retry delivery for one outbox row (Resolve-click retry). At-least-once OK. */
export async function POST(_request: Request, { params }: Params) {
  const session = await requireSessionUserId();
  if ("response" in session) return session.response;

  const { id } = await params;

  try {
    await getNotifyOutboxStatus(id, session.userId);
    await deliverNotifyOutbox(id);
    const notify = await getNotifyOutboxStatus(id, session.userId);
    return NextResponse.json({ ok: true, notify });
  } catch (err) {
    return triageErrorResponse(err);
  }
}
