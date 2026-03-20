const { PrismaClient: SystemClient } = require('./node_modules/@prisma/client/system');
const sys = new SystemClient();

async function run() {
  const configRes = await sys.appConfig.findMany();
  const config = configRes.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});
  
  const odataUrl = config.ODATA_URL;
  const odataUser = config.ODATA_USER;
  const odataPass = config.ODATA_PASS;
  
  const auth = Buffer.from(`${odataUser}:${odataPass}`).toString('base64');
  let url = odataUrl.trim();
  if (!url.endsWith('/')) url += '/';
  
  console.log('--- ODATA PROBE ---');
  console.log('Target:', url);
  
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
       console.error(`Request failed (${res.status}):`, await res.text());
       return;
    }

    const json = await res.json();
    const entities = json.value.map(e => e.name);
    console.log('TOTAL ENTITIES:', entities.length);
    console.log('ENTITIES LIST:', entities.join(', '));

  } catch (e) {
    console.error('PROBE ERROR:', e.message);
  } finally {
    process.exit();
  }
}
run();
