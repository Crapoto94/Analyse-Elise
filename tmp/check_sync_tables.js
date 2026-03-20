const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE name IN ('sync_DimDocumentMedium', 'sync_DimDocumentType', 'sync_DimDocumentState')");
  console.log('--- Found sync_ Metadata Tables ---');
  console.log(JSON.stringify(tables, null, 2));

  for (const table of tables) {
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM ${table.name}`);
    console.log(`\nTable ${table.name} row count:`, count);
    const sample = await prisma.$queryRawUnsafe(`SELECT * FROM ${table.name} LIMIT 3`);
    console.log(`Sample from ${table.name}:`, JSON.stringify(sample, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
