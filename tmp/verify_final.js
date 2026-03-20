const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serialize = (obj) => JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );

  const year = 2026;
  
  // Muni IDs (broadly)
  const muniEntities = await prisma.$queryRawUnsafe("SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|134%'");
  const muniIds = muniEntities.map(e => e.Id);

  // Courant IDs (DGS)
  const courantEntities = await prisma.$queryRawUnsafe("SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '1|269%'");
  const courantIds = courantEntities.map(e => e.Id);

  console.log(`Muni ID Count: ${muniIds.length}, Courant ID Count: ${courantIds.length}`);

  const total = await prisma.$queryRawUnsafe(`SELECT COUNT(*) as count FROM sync_FactDocument WHERE strftime('%Y', CreatedDate) = '${year}'`);
  console.log('Total Docs (2026):', total[0].count.toString());

  const muniDocs = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT DocumentId) as count FROM sync_FactTask 
    WHERE AssignedToStructureElementId IN (${muniIds.join(',')})
    AND DocumentId IN (SELECT Id FROM sync_FactDocument WHERE strftime('%Y', CreatedDate) = '${year}')
  `);
  console.log('Muni Docs (2026):', muniDocs[0].count.toString());

  const courantDocs = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT DocumentId) as count FROM sync_FactTask 
    WHERE AssignedToStructureElementId IN (${courantIds.join(',')})
    AND DocumentId IN (SELECT Id FROM sync_FactDocument WHERE strftime('%Y', CreatedDate) = '${year}')
  `);
  console.log('Courant Docs (2026):', courantDocs[0].count.toString());
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
