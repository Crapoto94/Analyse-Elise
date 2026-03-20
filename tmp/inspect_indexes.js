const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const indexes = await prisma.$queryRawUnsafe(`SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'`);
  console.log('--- Current SQLite Indexes ---');
  console.log(JSON.stringify(indexes, null, 2));

  const tables = ['sync_FactDocument', 'sync_FactTask', 'sync_DimStructureElementPath'];
  for (const table of tables) {
    console.log(`\n--- Schema for ${table} ---`);
    const schema = await prisma.$queryRawUnsafe(`PRAGMA table_info(${table})`);
    console.log(JSON.stringify(schema, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
