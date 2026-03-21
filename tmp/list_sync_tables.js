
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function listTables() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'`);
    console.log('--- sync_ Tables ---');
    console.log(tables.map(t => t.name));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

listTables();
