
const { PrismaClient } = require('@prisma/client');

async function testLimit() {
  const prisma = new PrismaClient({
    datasources: { db: { url: "file:C:/dev/Stat_Elise_New/entities.db" } }
  });

  const tableName = 'sync_DimStructureElementPath';
  try {
     // Prepare dummy data (20 columns, 500 rows)
     const cols = Array.from({length: 20}, (_, i) => `Level${i+1}`);
     const placeholders = [];
     const values = [];
     let paramCount = 1;

     for (let i = 0; i < 500; i++) {
        const rowP = ['?']; // _sync_date
        values.push('2024-01-01');
        rowP.push('?'); // _external_id
        values.push('ext_'+i);

        for (const col of cols) {
           rowP.push('?');
           values.push('data');
        }
        placeholders.push(`(${rowP.join(', ')})`);
     }

     const query = `INSERT INTO "${tableName}" ("_sync_date", "_external_id", ${cols.map(c => `"${c}"`).join(', ')}) VALUES ${placeholders.join(', ')} `;
     console.log('Parameters count:', values.length);
     
     await prisma.$executeRawUnsafe(query, ...values);
     console.log('SUCCESS!');
  } catch (err) {
    console.error('FAILED (EXCPECTED):', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

testLimit();
