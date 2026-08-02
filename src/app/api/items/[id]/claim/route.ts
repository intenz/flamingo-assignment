import { NextResponse } from "next/server";
import { catchTriage, requireSessionUserId } from "@/lib/api/http";
import { claimItem } from "@/lib/triage/claim";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireSessionUserId();
  if ("response" in session) return session.response;

  const { id } = await params;

  try {
    const result = await claimItem(id, session.userId);

    if (result.outcome === "won") {
      return NextResponse.json({
        ok: true,
        outcome: "won",
        item: result.item,
      });
    }

    // 200 on purpose — lost claim is a normal concurrency outcome for the UI.
    return NextResponse.json({
      ok: false,
      outcome: "already_claimed",
      message: result.message,
      item: result.item,
      holder: result.holder,
    });
  } catch (err) {
    return catchTriage(err);
  }
}
