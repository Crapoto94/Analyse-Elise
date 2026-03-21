
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/system.db" } }
});

async function inspectSystem() {
  try {
    const config = await prisma.$queryRawUnsafe(`SELECT * FROM AppConfig`);
    console.log('--- AppConfig ---');
    console.log(config);

    const logs = await prisma.$queryRawUnsafe(`SELECT message FROM SyncLog ORDER BY id DESC LIMIT 1`);
    console.log('--- Last SyncLog Message ---');
    console.log(logs[0]?.message);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

inspectSystem();
