const { PrismaClient: SystemClient } = require('./node_modules/@prisma/client/system');
const sys = new SystemClient();

async function run() {
  const configRes = await sys.appConfig.findMany();
  const config = configRes.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});
  
  const auth = Buffer.from(`${config.ODATA_USER}:${config.ODATA_PASS}`).toString('base64');
  let url = config.ODATA_URL.trim();
  if (!url.endsWith('/')) url += '/';
  
  const entity = 'DimStructureElementPath';
  console.log(`--- PROBING ${entity} ---`);
  
  try {
    const res = await fetch(`${url}${entity}?$top=1`, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
       console.error(`Request failed (${res.status}):`, await res.text());
       return;
    }

    const json = await res.json();
    if (json.value && json.value.length > 0) {
      console.log('Sample Data:', JSON.stringify(json.value[0], null, 2));
    } else {
      console.log('No data found for this entity.');
    }

  } catch (e) {
    console.error('PROBE ERROR:', e.message);
  } finally {
    process.exit();
  }
}
run();
