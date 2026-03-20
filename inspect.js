const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fs = require('fs');

async function main() {
  try {
    const docInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info('sync_FactDocument')`);
    const taskInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info('sync_FactTask')`);
    const pathInfo = await prisma.$queryRawUnsafe(`PRAGMA table_info('sync_DimStructureElementPath')`);
    
    fs.writeFileSync('inspect.json', JSON.stringify({
      FactDocument: docInfo.map(c => c.name),
      FactTask: taskInfo.map(c => c.name),
      DimStructureElementPath: pathInfo.map(c => c.name)
    }, null, 2));
  } catch (err) {
    console.error(err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
