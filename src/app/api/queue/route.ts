import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import {
  QUEUE_PAGE_SIZE,
  listItemsForWorkspace,
} from "@/lib/triage/list-items";
import {
  TriageError,
  httpStatusForTriageError,
} from "@/lib/triage/errors";

/**
 * Paginated workspace queue for the signed-in user's session workspace.
 * Query: `after` = last item id from previous page; `take` optional (default 50).
 */
export async function GET(request: Request) {
  const session = await getSessionUser();
  if (!session?.id || !session.workspaceId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Sign in first." },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const after = url.searchParams.get("after");
  const takeRaw = url.searchParams.get("take");
  const take = takeRaw ? Number.parseInt(takeRaw, 10) : QUEUE_PAGE_SIZE;
  if (!Number.isFinite(take) || take < 1 || take > 200) {
    return NextResponse.json(
      { error: "invalid_state", message: "take must be 1–200." },
      { status: 400 },
    );
  }

  try {
    const page = await listItemsForWorkspace(
      session.workspaceId,
      session.id,
      { take, after },
    );

    return NextResponse.json({
      items: page.items.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
      nextAfterId: page.nextAfterId,
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
