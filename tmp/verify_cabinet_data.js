const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serialize = (obj) => JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );

  const res = await prisma.$queryRawUnsafe("SELECT COUNT(*) as count FROM sync_FactDocument WHERE CreatedByStructureElementId IN (134, 707)");
  console.log('--- Cabinet Document Count (IDs 134, 707) ---');
  console.log(serialize(res));

  const sample = await prisma.$queryRawUnsafe("SELECT DocumentIdentifier, CreatedDate FROM sync_FactDocument WHERE CreatedByStructureElementId IN (134, 707) LIMIT 5");
  console.log('\n--- Sample Cabinet Documents ---');
  console.log(serialize(sample));

  // Check another potential identifier pattern
  const allByCabinet = await prisma.$queryRawUnsafe("SELECT DISTINCT SUBSTR(DocumentIdentifier, 1, 8) as prefix FROM sync_FactDocument WHERE CreatedByStructureElementId IN (134, 707) LIMIT 20");
  console.log('\n--- Cabinet Info (Prefixes) ---');
  console.log(serialize(allByCabinet));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
