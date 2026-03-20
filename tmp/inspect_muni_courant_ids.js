const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serialize = (obj) => JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );

  const elus = await prisma.$queryRawUnsafe("SELECT Id, Name FROM sync_DimStructureElement WHERE Name LIKE '%ELU%' LIMIT 20");
  console.log('--- Elus Structure Elements ---');
  console.log(serialize(elus));

  const dgs = await prisma.$queryRawUnsafe("SELECT Id, Name FROM sync_DimStructureElement WHERE Name LIKE '%DGS%' LIMIT 20");
  console.log('\n--- DGS Structure Elements ---');
  console.log(serialize(dgs));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
