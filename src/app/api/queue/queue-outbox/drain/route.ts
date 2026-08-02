import { NextResponse } from "next/server";
import { deliverPendingNotifies } from "@/lib/triage/queue/actions/notify-outbox";

/**
 * Manual / cron delivery for pending notify outbox rows.
 * Complements `after()` on resolve — retries survive process death.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const limitRaw = url.searchParams.get("limit");
  const limit = Math.min(
    50,
    Math.max(1, Number.parseInt(limitRaw ?? "10", 10) || 10),
  );

  const results = await deliverPendingNotifies(limit);
  return NextResponse.json({
    ok: true,
    drained: results.length,
    results,
  });
}
