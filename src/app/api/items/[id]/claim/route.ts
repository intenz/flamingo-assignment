import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/auth/session";
import { claimItem } from "@/lib/triage/claim";
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
    const result = await claimItem(id, userId);

    if (result.outcome === "won") {
      return NextResponse.json({
        ok: true,
        outcome: "won",
        item: result.item,
      });
    }

    // 200 on purpose — lost claim is a normal concurrency outcome for the UI
    // (tooltip + refresh holder), not a client/server failure.
    return NextResponse.json({
      ok: false,
      outcome: "already_claimed",
      message: result.message,
      item: result.item,
      holder: result.holder,
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
