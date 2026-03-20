const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRawUnsafe("SELECT Id, Name FROM sync_DimStructureElement WHERE Name LIKE '%CABINET%' LIMIT 20");
  console.log('--- Cabinet Structure Elements (by Name) ---');
  console.log(JSON.stringify(res, null, 2));

  // If still empty, search for everything to see what the Cabinet is called
  if (res.length === 0) {
     const allRoots = await prisma.$queryRawUnsafe("SELECT DISTINCT Level1, Level2 FROM sync_DimStructureElementPath LIMIT 20");
     console.log('\n--- Structure Roots (Level1, Level2) ---');
     console.log(JSON.stringify(allRoots, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
