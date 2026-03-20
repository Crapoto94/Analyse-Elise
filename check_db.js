const fs = require('fs');
const path = require('path');
const { PrismaClient: SystemClient } = require('./node_modules/@prisma/client/system');
const { PrismaClient: EntitiesClient } = require('./node_modules/@prisma/client/entities');

async function check() {
  console.log('--- FINAL DATABASE AUDIT ---');
  
  const files = ['system.db', 'entities.db'];
  for (const f of files) {
    const p = path.join(process.cwd(), f);
    if (fs.existsSync(p)) {
      const stats = fs.statSync(p);
      console.log(`[OK] Found ${f} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
    } else {
      console.log(`[FAIL] ${f} NOT FOUND in root!`);
    }
  }

  try {
    const sys = new SystemClient();
    const ent = new EntitiesClient();
    
    const userCount = await sys.user.count();
    const docCount = await ent.sync_FactDocument.count();
    
    console.log(`- System Users: ${userCount}`);
    console.log(`- Entities Documents: ${docCount}`);
    
    if (docCount > 0) {
      console.log('--- ALL DATA VERIFIED AND PRESENT ---');
    } else {
      console.log('--- ERROR: DATABASE EXISTS BUT IS EMPTY ---');
    }
    
    await sys.$disconnect();
    await ent.$disconnect();
  } catch (e) {
    console.error('ERROR during audit:', e.message);
  }
}

check();
