const { PrismaClient } = require('@prisma/client');
process.env.DATABASE_URL = "file:C:/dev/Stat_Elise_New/entities.db";
const prisma = new PrismaClient();

async function main() {
  try {
    const tables = ['sync_FactTask', 'sync_FactDocument', 'sync_DimStructureElementPath'];
    for (const table of tables) {
      console.log(`--- Indexes for ${table} ---`);
      const indexes = await prisma.$queryRawUnsafe(`PRAGMA index_list("${table}")`);
      console.log(JSON.stringify(indexes, null, 2));
      
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
      console.log(`--- Columns for ${table} ---`);
      // console.log(JSON.stringify(columns, null, 2));
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
