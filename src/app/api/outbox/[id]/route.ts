import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { getOutboxStatus } from "@/lib/triage/outbox";
import {
  TriageError,
  httpStatusForTriageError,
} from "@/lib/triage/errors";

type Params = { params: Promise<{ id: string }> };

/** Poll notify delivery status for an outbox row (workspace members only). */
export async function GET(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in first." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const notify = await getOutboxStatus(id, userId);
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
