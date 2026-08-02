import { after, NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { drainOutboxEntry } from "@/lib/triage/outbox";
import { resolveItem } from "@/lib/triage/resolve";
import {
  TriageError,
  httpStatusForTriageError,
} from "@/lib/triage/errors";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in first." },
      { status: 401 },
    );
  }

  const { id } = await params;

  try {
    const result = await resolveItem(id, userId);

    // Do not await notify — schedule drain after the response (serverless-safe via after/waitUntil).
    const outboxId = result.notify.outboxId;
    after(() => {
      void drainOutboxEntry(outboxId).catch((err) => {
        console.error("outbox drain after resolve failed", outboxId, err);
      });
    });

    return NextResponse.json({
      ok: true,
      item: result.item,
      notify: result.notify,
    });
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
