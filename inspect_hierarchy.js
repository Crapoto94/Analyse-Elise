const { PrismaClient } = require('./node_modules/@prisma/client/entities');
const p = new PrismaClient();
async function run() {
  try {
    const info = await p.$queryRawUnsafe('PRAGMA table_info(sync_DimStructureElementPath)');
    console.log('Columns:', JSON.stringify(info, (k,v) => typeof v === 'bigint' ? v.toString() : v, 2));
    const count = await p.sync_DimStructureElementPath.count();
    console.log('Count:', count);
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit();
  }
}
run();
