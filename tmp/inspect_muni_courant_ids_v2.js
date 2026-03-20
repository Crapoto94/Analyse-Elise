const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serialize = (obj) => JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );

  // Search for anything starting with 'ELU' or having 'ELU' in name but not just a person
  const elus = await prisma.$queryRawUnsafe("SELECT Id, Name FROM sync_DimStructureElement WHERE Name LIKE '%ELU%' OR Name LIKE '%MAIRE%' OR Name LIKE '%ADJOINT%' LIMIT 20");
  console.log('--- Potential Muni/Elus Elements ---');
  console.log(serialize(elus));

  // The user says "pôle DGS" is Courant
  const dgs = await prisma.$queryRawUnsafe("SELECT Id, Name FROM sync_DimStructureElement WHERE Name LIKE '%DGS%' LIMIT 20");
  console.log('\n--- DGS Structure Elements (Courant) ---');
  console.log(serialize(dgs));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
