/** True for transient Prisma / pg connection drops (common under prisma-dev load). */
export function isTransientDbError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { message?: string; code?: string; name?: string };
  const msg = `${e.message ?? ""} ${e.code ?? ""}`.toLowerCase();
  return (
    msg.includes("server has closed the connection") ||
    msg.includes("connection terminated") ||
    msg.includes("08p01") ||
    msg.includes("econnreset") ||
    msg.includes("cannot reach")
  );
}

export async function withTransientDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 4,
): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isTransientDbError(err) || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }
  throw last;
}
