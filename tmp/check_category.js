
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function checkCategory() {
  try {
    const res = await prisma.$queryRawUnsafe(`SELECT * FROM sync_DimContactCompanyCategory WHERE Id = 29`);
    console.log('--- Category 29 ---');
    console.log(res);
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategory();
