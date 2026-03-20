const { PrismaClient } = require('./node_modules/@prisma/client/entities');
const prisma = new PrismaClient();

async function main() {
  const tables = await prisma.$queryRawUnsafe('SELECT name FROM sqlite_master WHERE type="table"');
  console.log('TABLES:', tables.map(t => t.name));
  
  const closureTable = tables.find(t => t.name.toLowerCase().includes('closurereason'));
  if (closureTable) {
    const reasons = await prisma.$queryRawUnsafe(`SELECT * FROM ${closureTable.name}`);
    console.log('REASONS:', reasons);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
