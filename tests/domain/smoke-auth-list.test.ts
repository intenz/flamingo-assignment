import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { claimItem } from "@/lib/triage/claim";
import { releaseItem } from "@/lib/triage/release";
import { listItemsForWorkspace, QUEUE_PAGE_SIZE } from "@/lib/triage/list-items";

const FIXTURE_ITEM_ID = "itm_test_smoke_claim";
const WORKSPACE_ID = "ws_flamingo";
const USER_ID = "usr_bob";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

describe("auth + list + claim smoke", () => {
  const prisma = createClient();

  beforeAll(async () => {
    await prisma.item.deleteMany({ where: { id: FIXTURE_ITEM_ID } });
    await prisma.item.create({
      data: {
        id: FIXTURE_ITEM_ID,
        workspaceId: WORKSPACE_ID,
        title: "Smoke fixture — claim",
        body: "Created by tests/domain/smoke-auth-list.test.ts",
        status: "open",
      },
    });
  });

  afterAll(async () => {
    await prisma.item.deleteMany({ where: { id: FIXTURE_ITEM_ID } });
    await prisma.$disconnect();
  });

  it("lists at most QUEUE_PAGE_SIZE items for the workspace", async () => {
    const items = await listItemsForWorkspace(WORKSPACE_ID, USER_ID);
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(QUEUE_PAGE_SIZE);
    // Newest-first: createdAt should be non-increasing
    for (let i = 1; i < items.length; i++) {
      expect(items[i - 1]!.createdAt.getTime()).toBeGreaterThanOrEqual(
        items[i]!.createdAt.getTime(),
      );
    }
  });

  it("claims an open fixture item for the signed-in member", async () => {
    const result = await claimItem(FIXTURE_ITEM_ID, USER_ID);
    expect(result.outcome).toBe("won");
    if (result.outcome !== "won") return;
    expect(result.item.status).toBe("claimed");
    expect(result.item.claimedById).toBe(USER_ID);

    await releaseItem(FIXTURE_ITEM_ID, USER_ID);
    const again = await prisma.item.findUniqueOrThrow({
      where: { id: FIXTURE_ITEM_ID },
    });
    expect(again.status).toBe("open");
    expect(again.claimedById).toBeNull();
  });

  it("returns already_claimed (not a throw) when item is held", async () => {
    const first = await claimItem(FIXTURE_ITEM_ID, USER_ID);
    expect(first.outcome).toBe("won");

    const second = await claimItem(FIXTURE_ITEM_ID, "usr_carol");
    expect(second.outcome).toBe("already_claimed");
    if (second.outcome !== "already_claimed") return;
    expect(second.holder?.id).toBe(USER_ID);
    expect(second.message.toLowerCase()).toContain("claimed");

    await releaseItem(FIXTURE_ITEM_ID, USER_ID);
  });
});
