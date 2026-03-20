const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serialize = (obj) => JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );

  const info = await prisma.$queryRawUnsafe('PRAGMA table_info(sync_FactDocument)');
  console.log('--- sync_FactDocument Schema ---');
  console.log(serialize(info));

  const tasksInfo = await prisma.$queryRawUnsafe('PRAGMA table_info(sync_FactTask)');
  console.log('\n--- sync_FactTask Schema ---');
  console.log(serialize(tasksInfo));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
