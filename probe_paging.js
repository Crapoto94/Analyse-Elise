const { PrismaClient: SystemClient } = require('./node_modules/@prisma/client/system');
const sys = new SystemClient();

async function run() {
  const configRes = await sys.appConfig.findMany();
  const config = configRes.reduce((acc, c) => ({ ...acc, [c.key]: c.value }), {});
  
  const auth = Buffer.from(`${config.ODATA_USER}:${config.ODATA_PASS}`).toString('base64');
  let url = config.ODATA_URL.trim();
  if (!url.endsWith('/')) url += '/';
  
  const entity = 'DimStructureElementPath';
  console.log(`--- PROBING ${entity} FOR Paging Key ---`);
  
  try {
    const res = await fetch(`${url}${entity}?$top=300`, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });
    
    const json = await res.json();
    console.log('Keys in result:', Object.keys(json));
    if (json['@odata.nextLink']) console.log('Found @odata.nextLink:', json['@odata.nextLink']);
    
  } catch (e) {
    console.error('PROBE ERROR:', e.message);
  } finally {
    process.exit();
  }
}
run();
