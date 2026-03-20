const { prismaEntities } = require('../src/lib/prisma');

async function ensureIndexes(tableName) {
  const indexes = {
    'sync_FactTask': ['DocumentId', 'AssignedToStructureElementId'],
    'sync_FactDocument': ['Id', 'CreatedDate'],
    'sync_DimStructureElementPath': ['Id']
  };

  const cols = indexes[tableName];
  if (!cols) return;

  for (const col of cols) {
    const indexName = `idx_${tableName}_${col.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    console.log(`Creating index ${indexName} on ${tableName}(${col})...`);
    await prismaEntities.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "${indexName}" ON "${tableName}" ("${col}")`
    );
  }
}

async function main() {
  try {
    await ensureIndexes('sync_FactTask');
    await ensureIndexes('sync_FactDocument');
    
    // Check if they exist
    const res = await prismaEntities.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'`);
    console.log("Found indexes:", JSON.stringify(res, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await prismaEntities.$disconnect();
  }
}

main();
