const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRawUnsafe("SELECT DocumentIdentifier, Reference FROM sync_FactDocument WHERE DocumentIdentifier LIKE '%MUNI%' OR Reference LIKE '%MUNI%' LIMIT 5");
  console.log('--- Search Results for MUNI ---');
  console.log(JSON.stringify(res, null, 2));

  const cour = await prisma.$queryRawUnsafe("SELECT DocumentIdentifier, Reference FROM sync_FactDocument WHERE DocumentIdentifier LIKE '%COUR%' OR Reference LIKE '%COUR%' LIMIT 5");
  console.log('--- Search Results for COUR (Courant) ---');
  console.log(JSON.stringify(cour, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
