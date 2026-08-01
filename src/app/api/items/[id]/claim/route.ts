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
    const item = await claimItem(id, userId);
    return NextResponse.json({
      ok: true,
      item: {
        id: item.id,
        status: item.status,
        claimedById: item.claimedById,
        claimedByName: item.claimedBy?.name ?? null,
      },
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
