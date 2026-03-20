const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- Initializing Admin Suite DB ---');
  
  // Create AppConfig table
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "AppConfig" (
        "key" TEXT PRIMARY KEY,
        "value" TEXT NOT NULL
      );
    `);
    console.log('Success: AppConfig table created.');
  } catch (e) {
    console.error('Error creating AppConfig table:', e.message);
  }

  // Seed default OData config if not present
  try {
    await prisma.$executeRawUnsafe(`
      INSERT OR IGNORE INTO "AppConfig" (key, value) VALUES ('ODATA_URL', 'https://ivry-sur-seine.ods.arpege.fr/odata');
      INSERT OR IGNORE INTO "AppConfig" (key, value) VALUES ('ODATA_USER', 'ADM_STATS');
    `);
    console.log('Success: Default config seeded.');
  } catch (e) {
    console.error('Error seeding config:', e.message);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
