const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const logs = await prisma.$queryRawUnsafe('SELECT * FROM SyncLog ORDER BY startTime DESC LIMIT 5');
  console.log('--- Last 5 Sync Logs ---');
  console.log(JSON.stringify(logs, null, 2));

  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'");
  console.log('\n--- Actual sync_ Tables ---');
  console.log(tables.map(t => t.name).join(', '));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
