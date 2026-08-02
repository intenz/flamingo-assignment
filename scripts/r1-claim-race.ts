/**
 * R1: N parallel HTTP claims against one open item → exactly one winner.
 *
 * Prerequisites:
 *   npm run db:up && npm run db:seed   # once
 *   npm run dev                        # separate terminal
 *
 * Usage:
 *   npm run test:r1
 *   BASE_URL=http://localhost:3000 npm run test:r1
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  encodeSessionCookie,
  SESSION_COOKIE,
} from "../src/lib/auth/cookie";

const WORKSPACE_ID = "ws_flamingo";
const FIXTURE_ID = "itm_r1_http_race";
const ACTORS = ["usr_alice", "usr_bob", "usr_carol"] as const;
const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);

type ClaimBody = {
  ok?: boolean;
  outcome?: string;
  message?: string;
  error?: string;
  holder?: { id: string; name: string | null } | null;
  item?: { claimedById?: string | null };
};

function createPrisma() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

async function ensureOpenFixture(prisma: PrismaClient) {
  await prisma.item.deleteMany({ where: { id: FIXTURE_ID } });
  await prisma.item.create({
    data: {
      id: FIXTURE_ID,
      workspaceId: WORKSPACE_ID,
      title: "R1 HTTP race fixture",
      body: "Created by scripts/r1-claim-race.ts",
      status: "open",
    },
  });
}

async function claimAs(userId: string): Promise<{
  userId: string;
  status: number;
  body: ClaimBody;
}> {
  const res = await fetch(`${BASE_URL}/api/queue/queue-actions/${FIXTURE_ID}/claim`, {
    method: "POST",
    headers: {
      Cookie: `${SESSION_COOKIE}=${encodeSessionCookie(userId)}`,
      Accept: "application/json",
    },
  });
  const body = (await res.json()) as ClaimBody;
  return { userId, status: res.status, body };
}

async function assertServerUp() {
  try {
    const res = await fetch(`${BASE_URL}/api/queue/queue-actions/${FIXTURE_ID}/claim`, {
      method: "POST",
      headers: { Accept: "application/json" },
    });
    if (res.status === 401) return;
    // Server answered somehow — continue (fixture may 404 before create).
    if (res.ok || res.status === 404 || res.status === 200) return;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Cannot reach ${BASE_URL} (${msg}). Start the app with: npm run dev`,
    );
  }
}

async function main() {
  await assertServerUp();

  const prisma = createPrisma();
  try {
    await ensureOpenFixture(prisma);

    console.log(`R1 race: ${ACTORS.length} parallel claims → ${BASE_URL}`);
    console.log(`item: ${FIXTURE_ID}`);

    const results = await Promise.all(ACTORS.map((id) => claimAs(id)));

    for (const r of results) {
      console.log(
        `  ${r.userId}: HTTP ${r.status} outcome=${r.body.outcome ?? r.body.error ?? "?"}`,
      );
    }

    const winners = results.filter((r) => r.body.outcome === "won");
    const losers = results.filter((r) => r.body.outcome === "already_claimed");

    if (winners.length !== 1) {
      throw new Error(
        `Expected exactly 1 winner, got ${winners.length} (losers=${losers.length})`,
      );
    }
    if (losers.length !== ACTORS.length - 1) {
      throw new Error(
        `Expected ${ACTORS.length - 1} already_claimed, got ${losers.length}`,
      );
    }

    const winnerId = winners[0]!.body.item?.claimedById ?? winners[0]!.userId;
    for (const lost of losers) {
      if (lost.body.holder?.id !== winnerId) {
        throw new Error(
          `Loser ${lost.userId} saw holder ${lost.body.holder?.id}, expected ${winnerId}`,
        );
      }
    }

    const row = await prisma.item.findUniqueOrThrow({
      where: { id: FIXTURE_ID },
    });
    if (row.status !== "claimed" || row.claimedById !== winnerId) {
      throw new Error(
        `DB holder mismatch: status=${row.status} claimedById=${row.claimedById}`,
      );
    }

    console.log(`OK — single winner: ${winnerId}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
