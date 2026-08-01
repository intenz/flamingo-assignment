import { describe, expect, it } from "vitest";
import { decodeSessionCookie, encodeSessionCookie } from "@/lib/auth/cookie";

describe("session cookie HMAC", () => {
  it("round-trips a user id", () => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    const raw = encodeSessionCookie("usr_bob");
    expect(decodeSessionCookie(raw)).toBe("usr_bob");
  });

  it("rejects tampered payloads", () => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    const raw = encodeSessionCookie("usr_bob");
    const tampered = raw.replace("usr_bob", "usr_alice");
    expect(decodeSessionCookie(tampered)).toBeNull();
  });
});
