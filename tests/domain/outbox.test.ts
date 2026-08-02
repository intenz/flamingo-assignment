import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { claimItem } from "@/lib/triage/queue/actions/claim";
import { deliverNotifyOutbox } from "@/lib/triage/queue/actions/notify-outbox";
import { resolveItem } from "@/lib/triage/queue/actions/resolve";

const WORKSPACE_ID = "ws_flamingo";
const USER_ID = "usr_bob";
const ITEM_ID = "itm_test_r3_outbox";

const instantOk = { delayMs: 0, random: () => 1 }; // never fails
const instantFail = { delayMs: 0, random: () => 0 }; // always fails

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

async function resetClaimedItem(prisma: PrismaClient) {
  await prisma.notifyOutbox.deleteMany({ where: { itemId: ITEM_ID } });
  await prisma.item.deleteMany({ where: { id: ITEM_ID } });
  await prisma.item.create({
    data: {
      id: ITEM_ID,
      workspaceId: WORKSPACE_ID,
      title: "R3 outbox fixture",
      body: "tests/domain/outbox.test.ts",
      status: "open",
    },
  });
  const claimed = await claimItem(ITEM_ID, USER_ID, prisma);
  expect(claimed.outcome).toBe("won");
}

describe("R3 outbox resolve and drain", () => {
  const prisma = createClient();

  beforeEach(async () => {
    await resetClaimedItem(prisma);
  });

  afterAll(async () => {
    await prisma.notifyOutbox.deleteMany({ where: { itemId: ITEM_ID } });
    await prisma.item.deleteMany({ where: { id: ITEM_ID } });
    await prisma.$disconnect();
  });

  it("resolve writes pending outbox without waiting on notify", async () => {
    const result = await resolveItem(ITEM_ID, USER_ID, prisma);

    expect(result.item.status).toBe("resolved");
    expect(result.notify.status).toBe("pending");
    expect(result.notify.outboxId).toMatch(/^out_/);

    const row = await prisma.notifyOutbox.findUniqueOrThrow({
      where: { id: result.notify.outboxId },
    });
    expect(row.status).toBe("pending");
    expect(row.attempts).toBe(0);
    expect(row.deliveredAt).toBeNull();

    const item = await prisma.item.findUniqueOrThrow({ where: { id: ITEM_ID } });
    expect(item.status).toBe("resolved");
    expect(item.claimedById).toBe(USER_ID);
  });

  it("drain marks outbox delivered when notify succeeds", async () => {
    const { notify } = await resolveItem(ITEM_ID, USER_ID, prisma);

    const drained = await deliverNotifyOutbox(
      notify.outboxId,
      prisma,
      instantOk,
    );
    expect(drained.status).toBe("delivered");
    expect(drained.attempts).toBe(1);

    const row = await prisma.notifyOutbox.findUniqueOrThrow({
      where: { id: notify.outboxId },
    });
    expect(row.status).toBe("delivered");
    expect(row.deliveredAt).not.toBeNull();
    expect(row.lastError).toBeNull();
  });

  it("failed drain stays pending; second drain can send (best-effort-with-a-record)", async () => {
    const { notify } = await resolveItem(ITEM_ID, USER_ID, prisma);

    const first = await deliverNotifyOutbox(
      notify.outboxId,
      prisma,
      instantFail,
    );
    expect(first.status).toBe("failed");
    expect(first.attempts).toBe(1);

    const afterFail = await prisma.notifyOutbox.findUniqueOrThrow({
      where: { id: notify.outboxId },
    });
    expect(afterFail.status).toBe("pending");
    expect(afterFail.attempts).toBe(1);
    expect(afterFail.lastError).toBeTruthy();

    const second = await deliverNotifyOutbox(
      notify.outboxId,
      prisma,
      instantOk,
    );
    expect(second.status).toBe("delivered");
    expect(second.attempts).toBe(2);

    const afterOk = await prisma.notifyOutbox.findUniqueOrThrow({
      where: { id: notify.outboxId },
    });
    expect(afterOk.status).toBe("delivered");
  });
});
