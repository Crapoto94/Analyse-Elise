const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Discovery ---');
  const tables = await prisma.$queryRawUnsafe("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'");
  
  for (const t of tables) {
    console.log(`\nTable: ${t.name}`);
    const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${t.name}" LIMIT 1`);
    if (rows.length > 0) {
      console.log('Columns:', Object.keys(rows[0]).join(', '));
      // Log values of first row to understand data types
      console.log('Sample data:', JSON.stringify(rows[0], null, 2));
    } else {
      console.log('Empty table');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
