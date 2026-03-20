const path = require('path');
const { PrismaClient: MigrationClient } = require(path.join(process.cwd(), 'node_modules/@prisma/client/migration'));
const { PrismaClient: EntitiesClient } = require(path.join(process.cwd(), 'node_modules/@prisma/client/entities'));

async function migrate() {
  const mig = new MigrationClient();
  const ent = new EntitiesClient();

  console.log('--- REPAIRING MISSING DIMENSIONS ---');

  const tables = [
    'sync_DimDocumentMedium', 'sync_DimDocumentType', 'sync_DimDocumentState', 'sync_DimStructureElementPath'
  ];

  try {
    for (const table of tables) {
      try {
        console.log(`Processing table ${table}...`);
        // We know these tables exist in the source but might have schema differences
        const rows = await mig.$queryRawUnsafe(`SELECT * FROM ${table}`).catch(() => []);
        if (rows.length === 0) { console.log(`- Table ${table} is empty or not found in source.`); continue; }

        await ent.$transaction(async (tx) => {
          for (const row of rows) {
            const keys = Object.keys(row);
            const placeholders = keys.map(() => '?').join(',');
            const vals = Object.values(row);
            // We use INSERT OR REPLACE because we want to fix any partial data
            await tx.$executeRawUnsafe(`INSERT OR REPLACE INTO ${table} (${keys.map(k => `"${k}"`).join(',')}) VALUES (${placeholders})`, ...vals);
          }
        });
        console.log(`- ${table}: ${rows.length} rows migrated successfully.`);
      } catch (e) {
        console.error(`! Error on ${table}:`, e.message);
      }
    }
    console.log('--- Repair Finished ---');
  } finally {
    await mig.$disconnect();
    await ent.$disconnect();
  }
}

migrate();
