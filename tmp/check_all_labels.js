
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function checkCategories() {
  try {
    const types = await prisma.$queryRawUnsafe(`SELECT * FROM sync_DimDocumentType`);
    console.log('--- Document Types (Labels) ---');
    console.log(types.map(t => t.LabelFrFr || t.Label));

    const cats = await prisma.$queryRawUnsafe(`SELECT * FROM sync_DimDocumentTypeCategory`);
    console.log('--- Document Categories (Labels) ---');
    console.log(cats.map(c => c.LabelFrFr || c.Label));

    const mediums = await prisma.$queryRawUnsafe(`SELECT * FROM sync_DimDocumentMedium`);
    console.log('--- Document Mediums (Labels) ---');
    console.log(mediums.map(m => m.LabelFrFr || m.Label));
    
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
