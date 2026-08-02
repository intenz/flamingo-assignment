import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { claimItem } from "@/lib/triage/queue/actions/claim";
import { CLAIM_EXPIRED_MESSAGE, CLAIM_TTL_MS } from "@/lib/triage/queue/queue-constants";
import { releaseItem } from "@/lib/triage/queue/actions/release";
import { resolveItem } from "@/lib/triage/queue/actions/resolve";
import {
  reopenStaleClaimById,
  reopenStaleClaims,
  isClaimFresh,
} from "@/lib/triage/queue/actions/reopen-stale-claims";

const WS = "ws_flamingo";
const USER = "usr_bob";
const OTHER = "usr_carol";
const ITEM = "itm_test_r5_stale";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

async function resetOpenItem(prisma: PrismaClient) {
  await prisma.notifyOutbox.deleteMany({ where: { itemId: ITEM } });
  await prisma.item.deleteMany({ where: { id: ITEM } });
  await prisma.item.create({
    data: {
      id: ITEM,
      workspaceId: WS,
      title: "R5 stale fixture",
      body: "tests/domain/r5-stale.test.ts",
      status: "open",
    },
  });
}

describe("R5 stale claims", () => {
  const prisma = createClient();

  beforeEach(async () => {
    await resetOpenItem(prisma);
  });

  afterAll(async () => {
    await prisma.notifyOutbox.deleteMany({ where: { itemId: ITEM } });
    await prisma.item.deleteMany({ where: { id: ITEM } });
    await prisma.$disconnect();
  });

  it("isClaimFresh is false past the 30m TTL", () => {
    const now = new Date("2026-08-02T12:00:00.000Z");
    const fresh = new Date(now.getTime() - CLAIM_TTL_MS + 60_000);
    const stale = new Date(now.getTime() - CLAIM_TTL_MS - 1);
    expect(isClaimFresh(fresh, now)).toBe(true);
    expect(isClaimFresh(stale, now)).toBe(false);
    expect(isClaimFresh(null, now)).toBe(false);
  });

  it("reopenStaleClaims returns claimed rows older than TTL to open", async () => {
    const won = await claimItem(ITEM, USER, prisma);
    expect(won.outcome).toBe("won");

    const staleAt = new Date(Date.now() - CLAIM_TTL_MS - 60_000);
    await prisma.item.update({
      where: { id: ITEM },
      data: { claimedAt: staleAt },
    });

    const result = await reopenStaleClaims({
      workspaceId: WS,
      db: prisma,
    });
    expect(result.reopenedCount).toBeGreaterThanOrEqual(1);

    const row = await prisma.item.findUniqueOrThrow({ where: { id: ITEM } });
    expect(row.status).toBe("open");
    expect(row.claimedById).toBeNull();
    expect(row.claimedAt).toBeNull();
  });

  it("does not expire a fresh claim", async () => {
    const won = await claimItem(ITEM, USER, prisma);
    expect(won.outcome).toBe("won");

    const flipped = await reopenStaleClaimById(ITEM, { db: prisma });
    expect(flipped).toBe(false);

    const row = await prisma.item.findUniqueOrThrow({ where: { id: ITEM } });
    expect(row.status).toBe("claimed");
    expect(row.claimedById).toBe(USER);
  });

  it("claim after expiry lets another member win", async () => {
    const first = await claimItem(ITEM, USER, prisma);
    expect(first.outcome).toBe("won");

    await prisma.item.update({
      where: { id: ITEM },
      data: { claimedAt: new Date(Date.now() - CLAIM_TTL_MS - 1) },
    });

    const second = await claimItem(ITEM, OTHER, prisma);
    expect(second.outcome).toBe("won");
    if (second.outcome !== "won") return;
    expect(second.item.claimedById).toBe(OTHER);
  });

  it("resolve after expiry is rejected and item is open", async () => {
    const won = await claimItem(ITEM, USER, prisma);
    expect(won.outcome).toBe("won");

    await prisma.item.update({
      where: { id: ITEM },
      data: { claimedAt: new Date(Date.now() - CLAIM_TTL_MS - 1) },
    });

    await expect(resolveItem(ITEM, USER, prisma)).rejects.toMatchObject({
      code: "invalid_state",
      message: CLAIM_EXPIRED_MESSAGE,
    });

    const row = await prisma.item.findUniqueOrThrow({ where: { id: ITEM } });
    expect(row.status).toBe("open");
    expect(row.claimedById).toBeNull();
  });

  it("release after expiry is rejected", async () => {
    const won = await claimItem(ITEM, USER, prisma);
    expect(won.outcome).toBe("won");

    await prisma.item.update({
      where: { id: ITEM },
      data: { claimedAt: new Date(Date.now() - CLAIM_TTL_MS - 1) },
    });

    await expect(releaseItem(ITEM, USER, prisma)).rejects.toMatchObject({
      code: "invalid_state",
      message: CLAIM_EXPIRED_MESSAGE,
    });
  });

  it("fresh resolve still succeeds", async () => {
    const won = await claimItem(ITEM, USER, prisma);
    expect(won.outcome).toBe("won");

    const resolved = await resolveItem(ITEM, USER, prisma);
    expect(resolved.item.status).toBe("resolved");
    expect(resolved.notify.outboxId).toMatch(/^out_/);
  });
});
