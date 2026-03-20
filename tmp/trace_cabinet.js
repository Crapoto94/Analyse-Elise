const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const serialize = (obj) => JSON.stringify(obj, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value, 2
  );

  // Find tasks assigned to Cabinet
  const tasks = await prisma.$queryRawUnsafe("SELECT DISTINCT AssignedToStructureElementId, AssignedToStructureElementName FROM sync_FactTask WHERE AssignedToStructureElementName LIKE '%CABINET%' LIMIT 10");
  console.log('--- Tasks containing CABINET in name ---');
  console.log(serialize(tasks));

  if (tasks.length > 0) {
    const ids = tasks.map(t => t.AssignedToStructureElementId);
    const count = await prisma.$queryRawUnsafe(`SELECT COUNT(DISTINCT DocumentId) as count FROM sync_FactTask WHERE AssignedToStructureElementId IN (${ids.join(',')})`);
    console.log(`\n--- Document Count for these IDs (${ids.join(', ')}) ---`);
    console.log(serialize(count));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
