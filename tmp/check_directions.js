
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function checkDirections() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT * FROM sync_DimDocumentDirection`);
    console.log('--- Document Directions (Labels) ---');
    console.log(res.map(r => r.LabelFrFr || r.Label));
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkDirections();
