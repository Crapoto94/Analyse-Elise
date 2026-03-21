
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function deepSearch() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'`);
    
    for (const table of tables.map(t => t.name)) {
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
      const muniCol = columns.find(c => c.name.toLowerCase().includes('muni'));
      if (muniCol) {
        console.log(`FOUND potential column ${muniCol.name} in table ${table}`);
      }

      // Also search in categories
      if (table.includes('Category') || table.includes('Medium') || table.includes('Type')) {
         const labels = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}" WHERE Label LIKE '%Mirabeau%' OR Label LIKE '%Louis Bertrand%'`);
         if (labels.length > 0) {
            console.log(`--- FOUND in CATEGORY table ${table} ---`);
            console.log(labels);
         }
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

deepSearch();
