import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { listItemsForWorkspace } from "@/lib/triage/list-items";

const WS = "ws_r4_keyset";
const USER = "usr_bob";
const PAGE = 4;
const ORIGINAL = 12;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

async function resetWorkspace(prisma: PrismaClient) {
  await prisma.item.deleteMany({ where: { workspaceId: WS } });
  await prisma.membership.deleteMany({ where: { workspaceId: WS } });
  await prisma.workspace.deleteMany({ where: { id: WS } });

  await prisma.workspace.create({
    data: { id: WS, name: "R4 keyset fixtures" },
  });
  await prisma.membership.create({
    data: {
      id: "mem_r4_bob",
      workspaceId: WS,
      userId: USER,
      role: "member",
    },
  });
}

/** Newest-first: index 0 is newest. */
async function seedOrderedItems(prisma: PrismaClient, count: number) {
  const base = Date.parse("2026-01-15T12:00:00.000Z");
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const id = `itm_r4_${String(i).padStart(2, "0")}`;
    ids.push(id);
    await prisma.item.create({
      data: {
        id,
        workspaceId: WS,
        title: `R4 fixture ${i}`,
        body: "tests/domain/r4-keyset.test.ts",
        status: "open",
        createdAt: new Date(base - i * 60_000),
      },
    });
  }
  return ids;
}

async function walkKeysetPages(prisma: PrismaClient) {
  const seen: string[] = [];
  let after: string | null = null;
  for (let guard = 0; guard < 20; guard++) {
    const page = await listItemsForWorkspace(WS, USER, {
      take: PAGE,
      after,
      db: prisma,
    });
    for (const item of page.items) {
      seen.push(item.id);
    }
    if (!page.nextAfterId) break;
    after = page.nextAfterId;
  }
  return seen;
}

describe("R4 keyset pages under churn", () => {
  const prisma = createClient();

  beforeEach(async () => {
    await resetWorkspace(prisma);
  });

  afterAll(async () => {
    await prisma.item.deleteMany({ where: { workspaceId: WS } });
    await prisma.membership.deleteMany({ where: { workspaceId: WS } });
    await prisma.workspace.deleteMany({ where: { id: WS } });
    await prisma.$disconnect();
  });

  it("walks all pages without duplicate ids when newer items arrive between pages", async () => {
    const originalIds = await seedOrderedItems(prisma, ORIGINAL);

    const first = await listItemsForWorkspace(WS, USER, {
      take: PAGE,
      db: prisma,
    });
    expect(first.items.map((i) => i.id)).toEqual(originalIds.slice(0, PAGE));
    expect(first.nextAfterId).toBe(originalIds[PAGE - 1]);

    // Churn: brand-new rows land at the head of the queue (newest-first).
    const churnIds = ["itm_r4_new_a", "itm_r4_new_b", "itm_r4_new_c"];
    const now = Date.now();
    for (let i = 0; i < churnIds.length; i++) {
      await prisma.item.create({
        data: {
          id: churnIds[i]!,
          workspaceId: WS,
          title: `Churn insert ${i}`,
          body: "inserted between pages",
          status: "open",
          createdAt: new Date(now + i * 1000),
        },
      });
    }

    const rest: string[] = [];
    let after: string | null = first.nextAfterId;
    while (after) {
      const page = await listItemsForWorkspace(WS, USER, {
        take: PAGE,
        after,
        db: prisma,
      });
      rest.push(...page.items.map((i) => i.id));
      after = page.nextAfterId;
    }

    const walked = [...first.items.map((i) => i.id), ...rest];
    expect(new Set(walked).size).toBe(walked.length);
    expect(walked).toEqual(originalIds);
    // Newer inserts must not leak into pages after the cursor.
    for (const id of churnIds) {
      expect(rest).not.toContain(id);
    }
  });

  it("still has no duplicates after mid-queue claim/resolve churn", async () => {
    const originalIds = await seedOrderedItems(prisma, ORIGINAL);

    const first = await listItemsForWorkspace(WS, USER, {
      take: PAGE,
      db: prisma,
    });

    // Mutate rows that already appeared and rows still ahead — statuses change,
    // but keyset identity is (createdAt, id), so paging must not repeat.
    await prisma.item.update({
      where: { id: originalIds[0]! },
      data: {
        status: "claimed",
        claimedById: USER,
        claimedAt: new Date(),
      },
    });
    await prisma.item.update({
      where: { id: originalIds[PAGE + 1]! },
      data: {
        status: "resolved",
        claimedById: USER,
        claimedAt: new Date(),
      },
    });

    const rest: string[] = [];
    let after: string | null = first.nextAfterId;
    while (after) {
      const page = await listItemsForWorkspace(WS, USER, {
        take: PAGE,
        after,
        db: prisma,
      });
      rest.push(...page.items.map((i) => i.id));
      after = page.nextAfterId;
    }

    const walked = [...first.items.map((i) => i.id), ...rest];
    expect(new Set(walked).size).toBe(walked.length);
    expect(walked).toEqual(originalIds);
  });

  it("OFFSET repeats a row under the same insert churn; keyset does not", async () => {
    await seedOrderedItems(prisma, ORIGINAL);

    const offsetPage1 = await prisma.item.findMany({
      where: { workspaceId: WS },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE,
      skip: 0,
      select: { id: true },
    });

    await prisma.item.create({
      data: {
        id: "itm_r4_offset_churn",
        workspaceId: WS,
        title: "OFFSET churn",
        body: "shifts every later OFFSET page",
        status: "open",
        createdAt: new Date(),
      },
    });

    const offsetPage2 = await prisma.item.findMany({
      where: { workspaceId: WS },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: PAGE,
      skip: PAGE,
      select: { id: true },
    });

    const offsetIds = [
      ...offsetPage1.map((r) => r.id),
      ...offsetPage2.map((r) => r.id),
    ];
    // The last row of page1 is pushed into page2 after a head insert.
    expect(new Set(offsetIds).size).toBeLessThan(offsetIds.length);

    await prisma.item.delete({ where: { id: "itm_r4_offset_churn" } });
    const keysetIds = await walkKeysetPages(prisma);
    expect(new Set(keysetIds).size).toBe(keysetIds.length);
    expect(keysetIds).toHaveLength(ORIGINAL);
  });
});
