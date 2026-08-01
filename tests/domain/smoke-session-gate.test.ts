import { describe, expect, it } from "vitest";
import {
  decodeSessionCookie,
  encodeSessionCookie,
} from "@/lib/auth/cookie";

/**
 * Session gate smoke: unsigned/invalid cookies must not yield a user id.
 * (Full HTTP 401 coverage lands with route integration later.)
 */
describe("session required for mutations (smoke)", () => {
  it("decode returns null for missing cookie", () => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    expect(decodeSessionCookie(undefined)).toBeNull();
  });

  it("decode returns null for garbage", () => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    expect(decodeSessionCookie("not-a-session")).toBeNull();
  });

  it("valid cookie yields user id used by routes", () => {
    process.env.SESSION_SECRET = "test-secret-for-vitest";
    const raw = encodeSessionCookie("usr_alice");
    expect(decodeSessionCookie(raw)).toBe("usr_alice");
  });
});
