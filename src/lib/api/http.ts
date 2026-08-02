import {getSessionUserId} from "@/lib/auth/session";
import {
  TriageError,
  httpStatusForTriageError,
} from "@/lib/triage/errors";
import {NextResponse} from "next/server";

/** 401 JSON when the signed session cookie is missing. */
export async function requireSessionUserId(): Promise<
  {userId: string} | {response: NextResponse}
> {
  const userId = await getSessionUserId();
  if (!userId) {
    return {
      response: NextResponse.json(
        {error: "unauthorized", message: "Sign in first."},
        {status: 401},
      ),
    };
  }
  return {userId};
}

/** Catch `TriageError`, rethrow anything else. */
export function triageErrorResponse(
  err: unknown,
  extra?: (err: TriageError) => Record<string, unknown> | undefined,
): NextResponse {
  if (err instanceof TriageError) {
    return jsonFromTriageError(err, extra?.(err));
  }
  throw err;
}

/** Map a domain `TriageError` to JSON + status. Extra fields are merged into the body. */
export function jsonFromTriageError(
  err: TriageError,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {error: err.code, message: err.message, ...extra},
    {status: httpStatusForTriageError(err.code)},
  );
}