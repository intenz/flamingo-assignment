import { NextResponse } from "next/server";
import { catchTriage, requireSessionUserId } from "@/lib/api/http";
import { releaseItem } from "@/lib/triage/release";

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
    return catchTriage(err);
  }
}
