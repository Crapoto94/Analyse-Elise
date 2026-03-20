const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serialize = (obj) => JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );

  const sample = await prisma.$queryRawUnsafe("SELECT * FROM sync_DimStructureElementPath LIMIT 10");
  console.log('--- sync_DimStructureElementPath Sample ---');
  console.log(serialize(sample));

  const count = await prisma.$queryRawUnsafe("SELECT COUNT(*) as count FROM sync_DimStructureElementPath");
  console.log('\n--- sync_DimStructureElementPath Total Count ---');
  console.log(serialize(count));

  // Try searching in Level1, Level2, etc. directly
  const search = await prisma.$queryRawUnsafe("SELECT * FROM sync_DimStructureElementPath WHERE Level1 LIKE '%DGS%' OR Level2 LIKE '%DGS%' OR Level3 LIKE '%DGS%' LIMIT 5");
  console.log('\n--- DGS Search in Levels ---');
  console.log(serialize(search));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
