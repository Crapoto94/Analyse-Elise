const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const docCount = await prisma.sync_FactDocument.count();
    const taskCount = await prisma.sync_FactTask.count();
    console.log(`Documents: ${docCount}`);
    console.log(`Tasks: ${taskCount}`);

    // Query SyncLog from system DB if possible
    // Wait, prisma matches the schema.prisma which points to DATABASE_URL.
    // I need to check how prismaSystem is configured in the app.
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
