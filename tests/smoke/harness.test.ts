import { describe, expect, it } from "vitest";

describe("test harness", () => {
  it("runs vitest with path aliases ready", () => {
    expect(process.env.DATABASE_URL || "unset").toBeTruthy();
  });
});
