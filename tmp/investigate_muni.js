
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function investigate() {
  try {
    const muni = await prisma.$queryRawUnsafe(`SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|134%'`);
    const muniIds = muni.map(m => Number(m.Id));
    
    const muniDocIds = await prisma.$queryRawUnsafe(`
      SELECT DISTINCT DocumentId FROM sync_FactTask 
      WHERE AssignedToStructureElementId IN (${muniIds.join(',')})
      LIMIT 10
    `);

    if (muniDocIds.length === 0) {
      console.log('No Muni documents found in tasks!');
      return;
    }

    const docIds = muniDocIds.map(d => d.DocumentId);
    const docs = await prisma.$queryRawUnsafe(`
      SELECT Id, DirectionId, CreatedByStructureElementId, CreatedByStructureElementName 
      FROM sync_FactDocument 
      WHERE Id IN (${docIds.join(',')})
    `);

    console.log('--- Targeted Muni Docs Investigation ---');
    console.log(docs);

    // Also check the Path of these DirectionIds
    for (const doc of docs) {
       if (doc.DirectionId) {
         const path = await prisma.$queryRawUnsafe(`SELECT Path FROM sync_DimStructureElementPath WHERE Id = ${doc.DirectionId}`);
         console.log(`Doc ${doc.Id}: DirectionId ${doc.DirectionId} Path:`, path[0]?.Path);
       }
    }

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

investigate();
