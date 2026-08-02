import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { claimItem } from "@/lib/triage/claim";
import { releaseItem } from "@/lib/triage/release";

const WORKSPACE_ID = "ws_flamingo";
const SEQ_ITEM = "itm_test_r1_claim_seq";
const PARALLEL_ITEM = "itm_test_r1_claim_parallel";
const ACTORS = ["usr_alice", "usr_bob", "usr_carol"] as const;

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

async function resetOpenItem(prisma: PrismaClient, id: string, title: string) {
  await prisma.item.deleteMany({ where: { id } });
  await prisma.item.create({
    data: {
      id,
      workspaceId: WORKSPACE_ID,
      title,
      body: "R1 claim fixture",
      status: "open",
    },
  });
}

describe("R1 claim conflict and single holder", () => {
  const prisma = createClient();

  afterAll(async () => {
    await prisma.item.deleteMany({
      where: { id: { in: [SEQ_ITEM, PARALLEL_ITEM] } },
    });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetOpenItem(prisma, SEQ_ITEM, "R1 sequential claim fixture");
    await resetOpenItem(prisma, PARALLEL_ITEM, "R1 parallel claim fixture");
  });

  it("second claim returns already_claimed with the first holder", async () => {
    const first = await claimItem(SEQ_ITEM, "usr_bob", prisma);
    expect(first.outcome).toBe("won");

    const second = await claimItem(SEQ_ITEM, "usr_carol", prisma);
    expect(second.outcome).toBe("already_claimed");
    if (second.outcome !== "already_claimed") return;
    expect(second.holder?.id).toBe("usr_bob");
    expect(second.item.claimedById).toBe("usr_bob");

    const row = await prisma.item.findUniqueOrThrow({ where: { id: SEQ_ITEM } });
    expect(row.status).toBe("claimed");
    expect(row.claimedById).toBe("usr_bob");

    await releaseItem(SEQ_ITEM, "usr_bob");
  });

  // Separate clients avoid prepared-statement races on a shared pool under
  // prisma-dev; retry covers occasional connection drops from that server.
  it(
    "parallel claimItem calls yield exactly one winner and one DB holder",
    { retry: 3 },
    async () => {
      await resetOpenItem(prisma, PARALLEL_ITEM, "R1 parallel claim fixture");

      const clients = ACTORS.map(() => createClient());
      try {
        const results = await Promise.all(
          ACTORS.map((userId, i) =>
            claimItem(PARALLEL_ITEM, userId, clients[i]!),
          ),
        );

        const winners = results.filter((r) => r.outcome === "won");
        const losers = results.filter((r) => r.outcome === "already_claimed");

        expect(winners).toHaveLength(1);
        expect(losers).toHaveLength(ACTORS.length - 1);

        const winnerId =
          winners[0]!.outcome === "won" ? winners[0].item.claimedById : null;
        expect(winnerId).toBeTruthy();

        for (const lost of losers) {
          if (lost.outcome !== "already_claimed") continue;
          expect(lost.holder?.id).toBe(winnerId);
        }

        const row = await prisma.item.findUniqueOrThrow({
          where: { id: PARALLEL_ITEM },
        });
        expect(row.status).toBe("claimed");
        expect(row.claimedById).toBe(winnerId);

        await releaseItem(PARALLEL_ITEM, winnerId!);
      } finally {
        await Promise.all(clients.map((c) => c.$disconnect()));
      }
    },
  );
});
