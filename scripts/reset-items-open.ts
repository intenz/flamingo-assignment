import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const result = await prisma.item.updateMany({
      data: { status: "open", claimedById: null, claimedAt: null },
    });
    const spread = await prisma.item.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    console.log("updated", result.count);
    console.log(
      "spread",
      Object.fromEntries(spread.map((s) => [s.status, s._count._all])),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
