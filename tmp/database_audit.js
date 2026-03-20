const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'");
  console.log('--- SYNC TABLES ---');
  console.log(tables.map(t => t.name).join(', '));

  const priorityTables = ['sync_FactDocument', 'sync_FactTask', 'sync_DimStructureElementPath', 'sync_DimNature', 'sync_DimMedia', 'sync_DimStatus', 'sync_DimClosingReason'];
  
  for (const tableName of priorityTables) {
    const tableExists = tables.find(t => t.name === tableName);
    if (!tableExists) {
      console.log(`\nTable ${tableName} does NOT exist.`);
      continue;
    }

    console.log(`\n--- ${tableName} SCHEMA ---`);
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 1`);
    if (rows.length > 0) {
      console.log('Columns:', Object.keys(rows[0]).join(', '));
      console.log('Sample Row:', JSON.stringify(rows[0], null, 2));
    } else {
      console.log('Table exists but is empty.');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
