
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
});

async function findValue() {
  try {
    const tables = await prisma.$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'sync_%'`);
    
    for (const table of tables.map(t => t.name)) {
      const columns = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
      const textCols = columns.filter(c => c.type === 'TEXT').map(c => c.name);
      
      if (textCols.length === 0) continue;
      
      const orConditions = textCols.map(col => `"${col}" LIKE '%Mirabeau%'`).join(' OR ');
      const orConditions2 = textCols.map(col => `"${col}" LIKE '%Louis Bertrand%'`).join(' OR ');

      const query = `SELECT * FROM "${table}" WHERE ${orConditions} OR ${orConditions2} LIMIT 5`;
      const results = await prisma.$queryRawUnsafe(query);
      
      if (results.length > 0) {
        console.log(`--- FOUND in ${table} ---`);
        console.log(results);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

findValue();
