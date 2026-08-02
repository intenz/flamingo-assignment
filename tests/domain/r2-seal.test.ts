import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { claimItem } from "@/lib/triage/claim";
import { listItemsForWorkspace } from "@/lib/triage/list-items";
import { resolveItem } from "@/lib/triage/resolve";
import { releaseItem } from "@/lib/triage/release";
import { TriageError } from "@/lib/triage/errors";

const WS_HOME = "ws_flamingo";
const WS_OTHER = "ws_r2_other";
const USER_OUTSIDER = "usr_r2_outsider";
const USER_VIEWER = "usr_dave";
const USER_MEMBER = "usr_bob";
const ITEM_OTHER = "itm_r2_foreign";
const ITEM_HOME = "itm_r2_viewer_claim";

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

async function expectForbidden(fn: () => Promise<unknown>) {
  try {
    await fn();
    expect.fail("expected TriageError forbidden");
  } catch (err) {
    expect(err).toBeInstanceOf(TriageError);
    expect((err as TriageError).code).toBe("forbidden");
  }
}

describe("R2 workspace seal and viewer read-only", () => {
  const prisma = createClient();

  beforeAll(async () => {
    await prisma.item.deleteMany({
      where: { id: { in: [ITEM_OTHER, ITEM_HOME] } },
    });
    await prisma.membership.deleteMany({
      where: { id: "mem_r2_outsider" },
    });
    await prisma.user.deleteMany({ where: { id: USER_OUTSIDER } });
    await prisma.workspace.deleteMany({ where: { id: WS_OTHER } });

    await prisma.workspace.create({
      data: { id: WS_OTHER, name: "R2 Other Workspace" },
    });
    await prisma.user.create({
      data: {
        id: USER_OUTSIDER,
        name: "R2 Outsider",
        email: "outsider@flamingo.local",
      },
    });
    await prisma.membership.create({
      data: {
        id: "mem_r2_outsider",
        workspaceId: WS_OTHER,
        userId: USER_OUTSIDER,
        role: "owner",
      },
    });
    await prisma.item.create({
      data: {
        id: ITEM_OTHER,
        workspaceId: WS_OTHER,
        title: "Foreign workspace item",
        body: "R2 seal fixture",
        status: "open",
      },
    });
    await prisma.item.create({
      data: {
        id: ITEM_HOME,
        workspaceId: WS_HOME,
        title: "Viewer claim fixture",
        body: "R2 viewer fixture",
        status: "open",
      },
    });
  });

  afterAll(async () => {
    await prisma.item.deleteMany({
      where: { id: { in: [ITEM_OTHER, ITEM_HOME] } },
    });
    await prisma.membership.deleteMany({ where: { id: "mem_r2_outsider" } });
    await prisma.user.deleteMany({ where: { id: USER_OUTSIDER } });
    await prisma.workspace.deleteMany({ where: { id: WS_OTHER } });
    await prisma.$disconnect();
  });

  it("denies claim on an item outside the caller's workspace", async () => {
    await expectForbidden(() => claimItem(ITEM_OTHER, USER_MEMBER, prisma));
  });

  it("denies list for a workspace the user does not belong to", async () => {
    await expectForbidden(() =>
      listItemsForWorkspace(WS_OTHER, USER_MEMBER, { take: 10, db: prisma }),
    );
  });

  it("denies viewer claim / resolve / release on home workspace items", async () => {
    await expectForbidden(() => claimItem(ITEM_HOME, USER_VIEWER, prisma));

    // Seed a claimed row held by bob, then viewer must not resolve/release.
    await prisma.item.update({
      where: { id: ITEM_HOME },
      data: {
        status: "claimed",
        claimedById: USER_MEMBER,
        claimedAt: new Date(),
      },
    });

    await expectForbidden(() => resolveItem(ITEM_HOME, USER_VIEWER, prisma));
    await expectForbidden(() => releaseItem(ITEM_HOME, USER_VIEWER, prisma));

    await prisma.item.update({
      where: { id: ITEM_HOME },
      data: {
        status: "open",
        claimedById: null,
        claimedAt: null,
      },
    });
  });

  it("allows viewer to list the home workspace (read-only)", async () => {
    const { items } = await listItemsForWorkspace(WS_HOME, USER_VIEWER, {
      take: 10,
      db: prisma,
    });
    expect(items.length).toBeGreaterThan(0);
  });

  it("allows outsider to claim their own workspace item", async () => {
    const result = await claimItem(ITEM_OTHER, USER_OUTSIDER, prisma);
    expect(result.outcome).toBe("won");
    await prisma.item.update({
      where: { id: ITEM_OTHER },
      data: { status: "open", claimedById: null, claimedAt: null },
    });
  });
});
