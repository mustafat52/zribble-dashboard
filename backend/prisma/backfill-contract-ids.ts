import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.contract.findMany({
    where: { OR: [{ contractId: null }, { contractId: "" }] },
  });

  console.log(`Found ${rows.length} contracts needing a backfilled ID`);

  for (const row of rows) {
    await prisma.contract.update({
      where: { id: row.id },
      data: { contractId: `LEGACY-${row.id}` },
    });
  }

  console.log(`✅ Backfilled ${rows.length} contracts`);
}

main()
  .catch((e) => { console.error("❌ Backfill failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });