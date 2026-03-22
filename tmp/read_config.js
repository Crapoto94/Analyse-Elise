const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'file:./system.db'
    }
  }
});

async function main() {
  try {
    const config = await prisma.appConfig.findUnique({
      where: { key: 'odata_config' }
    });
    console.log('CONFIG:', config ? config.value : 'NOT_FOUND');
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}
main();
