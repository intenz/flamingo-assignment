/**
 * Seed for shared flamingo-triage tables (users/items/…).
 * Wipes triage tables then inserts ~10k items with mixed statuses.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const TOTAL_ITEMS = 10_000;
const BATCH_SIZE = 1_000;
const OPEN_RATIO = 0.82;
const CLAIMED_RATIO = 0.12;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  console.log("Seeding flamingo assignment (shared triage tables)…");

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE notify_outbox, items, memberships, workspaces, users RESTART IDENTITY CASCADE;
  `);

  await prisma.user.createMany({
    data: [
      { id: "usr_alice", name: "Alice Owner", email: "alice@flamingo.local" },
      { id: "usr_bob", name: "Bob Member", email: "bob@flamingo.local" },
      { id: "usr_carol", name: "Carol Member", email: "carol@flamingo.local" },
      { id: "usr_dave", name: "Dave Viewer", email: "dave@flamingo.local" },
    ],
  });

  await prisma.workspace.create({
    data: { id: "ws_flamingo", name: "Flamingo" },
  });

  await prisma.membership.createMany({
    data: [
      { id: "mem_alice", workspaceId: "ws_flamingo", userId: "usr_alice", role: "owner" },
      { id: "mem_bob", workspaceId: "ws_flamingo", userId: "usr_bob", role: "member" },
      { id: "mem_carol", workspaceId: "ws_flamingo", userId: "usr_carol", role: "member" },
      { id: "mem_dave", workspaceId: "ws_flamingo", userId: "usr_dave", role: "viewer" },
    ],
  });

  const openCount = Math.floor(TOTAL_ITEMS * OPEN_RATIO);
  const claimedCount = Math.floor(TOTAL_ITEMS * CLAIMED_RATIO);
  const resolvedCount = TOTAL_ITEMS - openCount - claimedCount;
  const claimants = ["usr_alice", "usr_bob", "usr_carol"] as const;

  const statusDeck: Array<"open" | "claimed" | "resolved"> = [
    ...Array<"open">(openCount).fill("open"),
    ...Array<"claimed">(claimedCount).fill("claimed"),
    ...Array<"resolved">(resolvedCount).fill("resolved"),
  ];
  for (let i = statusDeck.length - 1; i > 0; i--) {
    const j = (Math.imul(i + 1, 2654435761) >>> 0) % (i + 1);
    const tmp = statusDeck[i]!;
    statusDeck[i] = statusDeck[j]!;
    statusDeck[j] = tmp;
  }

  const base = Date.now();

  for (let offset = 0; offset < TOTAL_ITEMS; offset += BATCH_SIZE) {
    const end = Math.min(offset + BATCH_SIZE, TOTAL_ITEMS);
    const batch = [];

    for (let i = offset; i < end; i++) {
      const status = statusDeck[i]!;
      const claimedById =
        status === "open" ? null : claimants[i % claimants.length];
      const claimedAt =
        status === "open" ? null : new Date(base - (TOTAL_ITEMS - i) * 60_000);

      batch.push({
        id: `itm_${String(i + 1).padStart(5, "0")}`,
        workspaceId: "ws_flamingo",
        title: `Triage item ${i + 1}`,
        body: `Seeded body for item ${i + 1}`,
        status,
        claimedById,
        claimedAt,
        createdAt: new Date(base - (TOTAL_ITEMS - i) * 1_000),
        updatedAt: new Date(base - (TOTAL_ITEMS - i) * 1_000),
      });
    }

    await prisma.item.createMany({ data: batch });
    console.log(`  items ${end}/${TOTAL_ITEMS}`);
  }

  const counts = await prisma.item.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  console.log("Done.", {
    users: 4,
    workspace: "ws_flamingo",
    items: TOTAL_ITEMS,
    spread: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    expected: { open: openCount, claimed: claimedCount, resolved: resolvedCount },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
