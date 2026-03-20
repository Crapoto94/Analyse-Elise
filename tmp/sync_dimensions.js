const { PrismaClient: EntitiesClient } = require('../node_modules/@prisma/client/entities');
const { getODataClient } = require('../src/lib/odata');
const fs = require('fs');

async function syncDimensions() {
  const prisma = new EntitiesClient();
  // Get config from .env or default for this test
  const config = {
    ODATA_URL: process.env.ODATA_URL,
    ODATA_USER: process.env.ODATA_USER,
    ODATA_PASS: process.env.ODATA_PASS
  };

  if (!config.ODATA_URL) {
     console.error('ODATA URL missing in .env');
     process.exit(1);
  }

  const client = getODataClient(config);
  const dimensions = ['DimDocumentMedium', 'DimDocumentType', 'DimDocumentState', 'DimStructureElementPath'];

  console.log('--- TARGETED DIMENSION SYNC ---');

  for (const entity of dimensions) {
    try {
      console.log(`Syncing ${entity}...`);
      const res = await client.request(entity);
      const items = res.value || [];
      
      const tableName = `sync_${entity}`;
      
      // Basic insert for these small tables
      for (const item of items) {
        const extId = String(item.Id || item.Key);
        const keys = Object.keys(item);
        const placeholders = keys.map(() => '?').join(',');
        const vals = Object.values(item);
        
        // We use $executeRawUnsafe directly since schema might be dynamic
        await prisma.$executeRawUnsafe(
          `INSERT OR REPLACE INTO "${tableName}" (_external_id, ${keys.map(k => `"${k}"`).join(',')}) VALUES (?, ${placeholders})`,
          extId, ...vals
        );
      }
      console.log(`- ${entity}: ${items.length} records.`);
    } catch (e) {
      console.error(`- Error syncing ${entity}:`, e.message);
    }
  }
  
  await prisma.$disconnect();
}

syncDimensions();
