import { NextResponse } from "next/server";
import { triageErrorResponse, requireSessionUserId } from "@/lib/api/http";
import { releaseItem } from "@/lib/triage/queue/actions/release";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireSessionUserId();
  if ("response" in session) return session.response;

  const { id } = await params;

  try {
    const item = await releaseItem(id, session.userId);
    return NextResponse.json({
      ok: true,
      item: { id: item.id, status: item.status },
    });
  } catch (err) {
    return triageErrorResponse(err);
  }
}
