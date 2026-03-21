
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function audit() {
  try {
    // 1. Get Muni/Courant IDs
    const muni = await prisma.$queryRawUnsafe(`SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|134%'`);
    const muniIds = new Set(muni.map(m => Number(m.Id)));
    
    const courant = await prisma.$queryRawUnsafe(`SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|269%'`);
    const courantIds = new Set(courant.map(c => Number(c.Id)));

    // 2. Sample documents and their DirectionId
    const docs = await prisma.$queryRawUnsafe(`
      SELECT Id, DirectionId FROM sync_FactDocument LIMIT 500
    `);

    let countMuni = 0;
    let countCourant = 0;
    let countUnknown = 0;

    for (const doc of docs) {
      if (!doc.DirectionId) {
        countUnknown++;
        continue;
      }
      const dirId = Number(doc.DirectionId);
      if (muniIds.has(dirId)) countMuni++;
      else if (courantIds.has(dirId)) countCourant++;
      else countUnknown++;
    }

    console.log('--- DirectionId Audit ---');
    console.log('Total Docs Sampled:', docs.length);
    console.log('Attributed to Muni:', countMuni);
    console.log('Attributed to Courant:', countCourant);
    console.log('Unknown/Other:', countUnknown);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
