const { PrismaClient } = require('./node_modules/@prisma/client/entities');
const p = new PrismaClient();
async function run() {
  try {
    const tables = await p.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'");
    console.log('Tables:', JSON.stringify(tables.map(t => t.name), null, 2));
    
    // Check for both possible names of the path table
    const pathTable1 = await p.$queryRawUnsafe("SELECT COUNT(*) as c FROM sync_DimStructureElementPath").catch(() => [{c: -1}]);
    const pathTable2 = await p.$queryRawUnsafe("SELECT COUNT(*) as c FROM sync_StructureElementPath").catch(() => [{c: -1}]);
    
    console.log('sync_DimStructureElementPath count:', pathTable1[0].c);
    console.log('sync_StructureElementPath count:', pathTable2[0].c);

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit();
  }
}
run();
