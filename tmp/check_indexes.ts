import { prismaEntities } from '../src/lib/prisma';

async function main() {
  const tables = ['sync_FactTask', 'sync_FactDocument', 'sync_DimStructureElementPath'];
  for (const table of tables) {
    console.log(`--- Indexes for ${table} ---`);
    const indexes = await prismaEntities.$queryRawUnsafe(`PRAGMA index_list("${table}")`);
    console.table(indexes);
    
    for (const idx of (indexes as any[])) {
      const info = await prismaEntities.$queryRawUnsafe(`PRAGMA index_info("${idx.name}")`);
      console.log(`Index ${idx.name} columns:`);
      console.table(info);
    }
  }
}

main().catch(console.error).finally(() => prismaEntities.$disconnect());
