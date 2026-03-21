
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function discover() {
  try {
    const sample = await prisma.$queryRawUnsafe(`SELECT * FROM sync_FactDocument LIMIT 1`);
    console.log('--- sync_FactDocument Columns ---');
    console.log(Object.keys(sample[0]));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

discover();
