
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function audit() {
  try {
    const muni = await prisma.$queryRawUnsafe(`SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|134%'`);
    const muniIds = new Set(muni.map(m => Number(m.Id)));
    
    const courant = await prisma.$queryRawUnsafe(`SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|269%'`);
    const courantIds = new Set(courant.map(c => Number(c.Id)));

    const docs = await prisma.$queryRawUnsafe(`
      SELECT Id, DirectionId, CreatedByStructureElementId FROM sync_FactDocument LIMIT 1000
    `);

    let stats = {
      dirMuni: 0, dirCourant: 0,
      createMuni: 0, createCourant: 0,
      bothMuni: 0, mixed: 0, none: 0
    };

    for (const doc of docs) {
      const dM = muniIds.has(Number(doc.DirectionId));
      const cM = muniIds.has(Number(doc.CreatedByStructureElementId));

      if (dM && cM) stats.bothMuni++;
      else if (dM || cM) stats.mixed++;
      
      if (dM) stats.dirMuni++; else if (doc.DirectionId) stats.dirCourant++;
      if (cM) stats.createMuni++; else if (doc.CreatedByStructureElementId) stats.createCourant++;
    }

    console.log('--- Multi-Field Audit ---');
    console.log(stats);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

audit();
