
const { PrismaClient } = require('@prisma/client');

async function debugPostgres() {
  const prisma = new PrismaClient({
    datasources: { db: { url: "postgresql://postgres:postgres@localhost:5432/app_entities?schema=public" } }
  });

  const tableName = 'sync_FactDocument_Test';
  const columns = [
    { name: 'Id', type: 'DOUBLE PRECISION' },
    { name: 'Key', type: 'TEXT' },
    { name: 'UpdatedTimestamp', type: 'TEXT' },
    { name: 'DirectionId', type: 'DOUBLE PRECISION' },
    { name: 'Reported', type: 'BOOLEAN' },
    { name: '_external_id', type: 'TEXT' }
  ];

  try {
     console.log('Creating table...');
     const colDefs = columns.map(c => `"${c.name}" ${c.type}`).join(', ');
     await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${tableName}"`);
     await prisma.$executeRawUnsafe(`CREATE TABLE "${tableName}" (_id SERIAL PRIMARY KEY, _sync_date TEXT, ${colDefs})`);
     await prisma.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD CONSTRAINT "${tableName}_ext_unique" UNIQUE ("_external_id")`);

     console.log('Inserting batch...');
     const batchSize = 10;
     const placeholders = [];
     const values = [];
     let paramCount = 1;

     for (let i = 0; i < batchSize; i++) {
        const rowP = [`$${paramCount++}::TEXT`]; // _sync_date
        values.push(new Date().toISOString());

        for (const col of columns) {
           rowP.push(`$${paramCount++}::${col.type}`);
           if (col.type === 'BOOLEAN') values.push(true);
           else if (col.type === 'DOUBLE PRECISION') values.push(123.45);
           else values.push('test_val');
        }
        placeholders.push(`(${rowP.join(', ')})`);
     }

     const updateSet = columns.filter(c => c.name !== '_external_id').map(c => `"${c.name}" = EXCLUDED."${c.name}"`).join(', ');
     const query = `INSERT INTO "${tableName}" ("_sync_date", ${columns.map(c => `"${c.name}"`).join(', ')}) VALUES ${placeholders.join(', ')} ON CONFLICT ("_external_id") DO UPDATE SET ${updateSet}`;
     
     await prisma.$executeRawUnsafe(query, ...values);
     console.log('SUCCESS!');

  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    await prisma.$disconnect();
  }
}

debugPostgres();
