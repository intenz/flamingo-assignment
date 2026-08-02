import { after, NextResponse } from "next/server";
import { catchTriage, requireSessionUserId } from "@/lib/api/http";
import { CLAIM_EXPIRED_MESSAGE } from "@/lib/triage/claim-constants";
import { drainOutboxEntry } from "@/lib/triage/outbox";
import { resolveItem } from "@/lib/triage/resolve";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await requireSessionUserId();
  if ("response" in session) return session.response;

  const { id } = await params;

  try {
    const result = await resolveItem(id, session.userId);

    // Do not await notify — drain after the response (serverless-safe).
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
    return catchTriage(err, (e) =>
      e.message === CLAIM_EXPIRED_MESSAGE
        ? {
            item: {
              status: "open",
              claimedById: null,
              claimedByName: null,
            },
          }
        : undefined,
    );
  }
}
