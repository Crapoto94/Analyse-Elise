const { PrismaClient: SystemClient } = require('./node_modules/@prisma/client/system');
const sys = new SystemClient();

async function run() {
  try {
    const configRes = await sys.appConfig.findMany();
    const config = configRes.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});
    
    console.log('--- 1. OPTIMIZING ---');
    const optRes = await fetch('http://localhost:5002/api/sync/optimize', { method: 'POST' });
    console.log('Optimize Result:', await optRes.json());

    console.log('--- 2. REPAIRING DIMENSIONS (FULL) ---');
    const repRes = await fetch('http://localhost:5002/api/sync/dimensions', { 
      method: 'POST', 
      body: JSON.stringify({ config }) 
    });
    console.log('Repair Result:', JSON.stringify(await repRes.json(), null, 2));

  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit();
  }
}
run();
