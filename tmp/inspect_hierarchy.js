const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.$queryRawUnsafe(`
    SELECT DISTINCT Level1, Level2, Level3, Level4, Level5 
    FROM sync_DimStructureElementPath 
    WHERE Path LIKE '1|269%'
    LIMIT 100
  `);
  console.log(JSON.stringify(res, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
