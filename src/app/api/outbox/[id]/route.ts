import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import {
  drainOutboxEntry,
  getOutboxStatus,
} from "@/lib/triage/outbox";
import {
  TriageError,
  httpStatusForTriageError,
} from "@/lib/triage/errors";

type Params = { params: Promise<{ id: string }> };

async function requireUser() {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      error: NextResponse.json(
        { error: "unauthorized", message: "Sign in first." },
        { status: 401 },
      ),
    };
  }
  return { userId };
}

/** Poll notify delivery status for an outbox row (workspace members only). */
export async function GET(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;

  try {
    const notify = await getOutboxStatus(id, auth.userId!);
    return NextResponse.json({ ok: true, notify });
  } catch (err) {
    if (err instanceof TriageError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: httpStatusForTriageError(err.code) },
      );
    }
    throw err;
  }
}

/** Retry drain for one outbox row (UI Retry / poll). At-least-once OK. */
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireUser();
  if ("error" in auth && auth.error) return auth.error;

  const { id } = await params;

  try {
    // ACL: must be able to read the outbox (workspace member)
    await getOutboxStatus(id, auth.userId!);
    await drainOutboxEntry(id);
    const notify = await getOutboxStatus(id, auth.userId!);
    return NextResponse.json({ ok: true, notify });
  } catch (err) {
    if (err instanceof TriageError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: httpStatusForTriageError(err.code) },
      );
    }
    throw err;
  }
}
