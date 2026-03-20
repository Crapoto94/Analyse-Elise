const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRawUnsafe("SELECT Id, Path, Level1, Level2, Level3 FROM sync_DimStructureElementPath WHERE Path LIKE '%CABINET%' LIMIT 10");
  console.log('--- Cabinet Structure Entities ---');
  console.log(JSON.stringify(res, null, 2));

  const count = await prisma.$queryRawUnsafe("SELECT COUNT(*) as total FROM sync_FactDocument WHERE CreatedByStructureElementId IN (SELECT Id FROM sync_DimStructureElementPath WHERE Path LIKE '%CABINET%')");
  console.log('\n--- Count of Documents created by Cabinet ---');
  console.log(JSON.stringify(count, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
