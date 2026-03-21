
const { getODataClient } = require('../src/lib/odata');
const { PrismaClient } = require('@prisma/client');

async function debugSync() {
  const config = {
    baseUrl: 'https://ville-ivry94.illico.city/AppBI/odata/',
    username: 'User_StatBI',
    password: '2V.}dyRB,8P9h6]8=Fte'
  };
  
  const prismaEntities = new PrismaClient({
    datasources: { db: { url: "postgresql://postgres:postgres@localhost:5432/app_entities?schema=public" } }
  });

  const client = getODataClient(config);
  const entity = 'DimStructureElementPath';

  try {
     console.log(`Syncing ${entity}...`);
     const res = await client.request(`${entity}?$top=10`);
     const items = res.value;
     
     // Mimic the sync route logic
     const sample = items[0];
     const cols = Object.keys(sample).map(k => ({ name: k, type: 'TEXT' }));
     const allCols = [{ name: '_external_id', type: 'TEXT' }, ...cols];
     const tableName = `sync_${entity}`;

     // Check table
     console.log('Ensuring table...');
     const colDefs = allCols.map(c => `"${c.name}" ${c.type}`).join(', ');
     await prismaEntities.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS "${tableName}" (_id SERIAL PRIMARY KEY, _sync_date TEXT, ${colDefs})`);
     try {
       await prismaEntities.$executeRawUnsafe(`ALTER TABLE "${tableName}" ADD CONSTRAINT "${tableName}_external_id_unique" UNIQUE ("_external_id")`);
     } catch(e) {}

     // Upsert
     console.log('Upserting...');
     const nowStr = new Date().toISOString();
     const colNames = ['_sync_date', ...allCols.map(c => c.name)];
     const colNamesStr = colNames.map(n => `"${n}"`).join(', ');
     const updateSet = colNames.filter(n => n !== '_external_id').map(n => `"${n}" = EXCLUDED."${n}"`).join(', ');
     
     const placeholders = [];
     const values = [];
     let paramCount = 1;

     for (const item of items) {
        item._external_id = item.Id ? String(item.Id) : item.Key ? String(item.Key) : 'test';
        const rowP = [`$${paramCount++}::TEXT`];
        values.push(nowStr);
        for(const col of allCols) {
           rowP.push(`$${paramCount++}::TEXT`);
           values.push(item[col.name] || null);
        }
        placeholders.push(`(${rowP.join(', ')})`);
     }

     const query = `INSERT INTO "${tableName}" (${colNamesStr}) VALUES ${placeholders.join(', ')} ON CONFLICT ("_external_id") DO UPDATE SET ${updateSet}`;
     console.log('Query length:', query.length);
     await prismaEntities.$executeRawUnsafe(query, ...values);
     console.log('SUCCESS!');

  } catch (err) {
    console.error('FAILED:', err);
  } finally {
    await prismaEntities.$disconnect();
  }
}

debugSync();
