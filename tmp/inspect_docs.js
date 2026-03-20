const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const docs = await prisma.sync_FactDocument.findMany({ take: 20 });
  console.log('--- Sample FactDocument Rows ---');
  console.log(JSON.stringify(docs, null, 2));

  // Check if there are any identifiers that look like 'Muni' or 'Courant'
  const ids = docs.map(d => d.DocumentIdentifier || '');
  console.log('\n--- DocumentIdentifiers ---');
  console.log(ids.join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
