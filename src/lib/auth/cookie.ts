import { createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "flamingo_session";

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("SESSION_SECRET is not set");
  }
  return value;
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(userId).digest("base64url");
}

/** Cookie value: `${userId}.${sig}` */
export function encodeSessionCookie(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Returns userId if signature is valid; otherwise null. */
export function decodeSessionCookie(value: string | undefined): string | null {
  if (!value) return null;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return null;

  const userId = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!userId || !sig) return null;

  const expected = sign(userId);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;
  return userId;
}
