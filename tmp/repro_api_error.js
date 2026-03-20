const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const muniEntities = await prisma.$queryRawUnsafe(`
      SELECT Id FROM sync_DimStructureElementPath 
      WHERE Path LIKE '1|134%'
    `);
    const muniIds = muniEntities.map(e => e.Id);
    
    console.log('Muni IDs raw:', muniIds.slice(0, 3));
    console.log('Muni IDs joined:', muniIds.slice(0, 3).join(','));

    // Try the query that likely fails
    const sql = `SELECT DISTINCT DocumentId FROM sync_FactTask 
                 WHERE AssignedToStructureElementId IN (${muniIds.length ? muniIds.join(',') : '-1'}) LIMIT 5`;
    console.log('\nGenerated SQL sample:', sql.substring(0, 200));
    
    const res = await prisma.$queryRawUnsafe(sql);
    console.log('\nQuery executed successfully.');
  } catch (error) {
    console.error('\nQuery failed as expected:', error.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
