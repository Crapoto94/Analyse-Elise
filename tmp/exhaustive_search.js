
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function exhaustiveSearch() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'`);
    
    for (const table of tables.map(t => t.name)) {
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
      const allCols = columns.map(c => c.name);
      
      const conditions = allCols.map(col => `CAST("${col}" AS TEXT) LIKE '%Mirabeau%' OR CAST("${col}" AS TEXT) LIKE '%Louis Bertrand%'`).join(' OR ');
      
      const query = `SELECT * FROM "${table}" WHERE ${conditions} LIMIT 5`;
      try {
        const results = await prisma.$queryRawUnsafe(query);
        if (results.length > 0) {
          console.log(`--- FOUND in ${table} ---`);
          console.log(results);
        }
      } catch (e) {}
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

exhaustiveSearch();
