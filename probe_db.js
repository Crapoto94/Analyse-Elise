const { PrismaClient: SystemClient } = require('./node_modules/@prisma/client/system');
const sys = new SystemClient();

async function test() {
  try {
    const configRes = await sys.appConfig.findUnique({ where: { key: 'odata_config' } });
    if (!configRes) {
      console.error('No OData config found in system.db');
      return;
    }
    
    const config = JSON.parse(configRes.value);
    const odataUrl = config.ODATA_URL || config.baseUrl;
    const odataUser = config.ODATA_USER || config.username;
    const odataPass = config.ODATA_PASS || config.password;
    
    if (!odataUrl) {
      console.error('ODATA URL missing in config');
      return;
    }

    const auth = Buffer.from(`${odataUser}:${odataPass}`).toString('base64');
    
    console.log('--- ODATA PROBE (DB CONFIG) ---');
    console.log('URL:', odataUrl);
    
    const res = await fetch(odataUrl, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
       console.error('Request failed:', res.status, res.statusText);
       return;
    }

    const json = await res.json();
    const entities = (json.value || []).map(e => e.name);
    console.log('TOTAL ENTITIES:', entities.length);
    
    const interesting = [
      'Structure', 'Path', 'Hierarchy', 'Medium', 'Support', 'Vecteur', 'Type', 'State', 'Status'
    ];
    
    for (const entity of entities) {
      if (interesting.some(i => entity.toLowerCase().includes(i.toLowerCase()))) {
        console.log(`- ${entity}`);
      }
    }

  } catch (e) {
    console.error('PROBE ERROR:', e.message);
  } finally {
    await sys.$disconnect();
  }
}
test();
