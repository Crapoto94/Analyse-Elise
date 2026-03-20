const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const info = await prisma.$queryRawUnsafe('PRAGMA table_info(sync_FactDocument)');
  console.log('--- sync_FactDocument Schema ---');
  console.log(JSON.stringify(info, null, 2));

  const tasksInfo = await prisma.$queryRawUnsafe('PRAGMA table_info(sync_FactTask)');
  console.log('\n--- sync_FactTask Schema ---');
  console.log(JSON.stringify(tasksInfo, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
