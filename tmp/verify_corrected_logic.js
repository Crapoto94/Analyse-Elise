const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const year = 2026;
  
  // Muni IDs (broadly)
  const muniEntities = await prisma.$queryRawUnsafe(`
    SELECT Id FROM sync_DimStructureElementPath 
    WHERE Path LIKE '%CABINET%' OR Path LIKE '%MAIRE%' OR Path LIKE '%ELU%' OR Path LIKE '%ADJOINT%'
  `);
  const muniIds = muniEntities.map(e => e.Id);

  // Courant IDs (DGS)
  const courantEntities = await prisma.$queryRawUnsafe(`
    SELECT Id FROM sync_DimStructureElementPath 
    WHERE Path LIKE '%DGS%'
  `);
  const courantIds = courantEntities.map(e => e.Id);

  console.log(`Muni ID Count: ${muniIds.length}, Courant ID Count: ${courantIds.length}`);

  const total = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM sync_FactDocument WHERE strftime('%Y', CreatedDate) = '${year}'`);
  console.log('Total Docs (2026):', total);

  const muniDocs = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT DocumentId) as count FROM sync_FactTask 
    WHERE AssignedToStructureElementId IN (${muniIds.join(',')})
  `);
  console.log('Muni Docs (Assigned to Cabinet/Elus):', muniDocs);

  const courantDocs = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT DocumentId) as count FROM sync_FactTask 
    WHERE AssignedToStructureElementId IN (${courantIds.join(',')})
  `);
  console.log('Courant Docs (Assigned to DGS):', courantDocs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
