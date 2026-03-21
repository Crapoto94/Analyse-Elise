
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function findInStructure() {
  try {
    const results = await prisma.$queryRawUnsafe(`
      SELECT * FROM sync_DimStructureElement 
      WHERE Name LIKE '%Mirabeau%' OR Name LIKE '%Louis Bertrand%'
    `);
    
    console.log('--- sync_DimStructureElement Results ---');
    console.log(results);

    const paths = await prisma.$queryRawUnsafe(`
      SELECT * FROM sync_DimStructureElementPath 
      WHERE Level1 LIKE '%Mirabeau%' OR Level2 LIKE '%Mirabeau%' OR Level3 LIKE '%Mirabeau%' OR Level4 LIKE '%Mirabeau%' OR Level5 LIKE '%Mirabeau%'
      OR Level1 LIKE '%Louis Bertrand%' OR Level2 LIKE '%Louis Bertrand%' OR Level3 LIKE '%Louis Bertrand%' OR Level4 LIKE '%Louis Bertrand%' OR Level5 LIKE '%Louis Bertrand%'
    `);
    
    console.log('--- sync_DimStructureElementPath Results ---');
    console.log(paths);

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findInStructure();
