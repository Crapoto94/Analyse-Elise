
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/system.db" } }
});

async function listSystem() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table'`);
    console.log('--- system.db Tables ---');
    console.log(tables.map(t => t.name));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

listSystem();
