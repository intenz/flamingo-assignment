import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Fail fast with a clear message if prisma-dev is down. */
async function assertDatabaseReachable() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set (needed for domain tests)");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  let last: unknown;
  for (let i = 0; i < 8; i++) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      await prisma.$disconnect();
      return;
    } catch (err) {
      last = err;
      await new Promise((r) => setTimeout(r, 100 * (i + 1)));
    }
  }

  await prisma.$disconnect().catch(() => undefined);
  throw new Error(
    `Database not reachable at DATABASE_URL. Run: npm run db:up\n${String(last)}`,
  );
}

await assertDatabaseReachable();
