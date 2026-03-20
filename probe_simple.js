const fs = require('fs');
const path = require('path');

async function probe() {
  const envPath = path.join(process.cwd(), '.env');
  const env = fs.readFileSync(envPath, 'utf8');
  const odataUrl = env.match(/ODATA_URL="(.+)"/)[1];
  const odataUser = env.match(/ODATA_USER="(.+)"/)[1];
  const odataPass = env.match(/ODATA_PASS="(.+)"/)[1];

  const auth = Buffer.from(`${odataUser}:${odataPass}`).toString('base64');
  
  console.log('Probing OData at:', odataUrl);
  try {
    const res = await fetch(odataUrl, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });
    const json = await res.json();
    const entities = json.value.map(e => e.name);
    console.log('Entities found:', entities.join(', '));
    
    // Check specific ones
    const interesting = ['StructureElementPath', 'DimStructureElementPath', 'DocumentMedium', 'DimDocumentMedium'];
    const found = interesting.filter(i => entities.includes(i));
    console.log('Interesting Entities Found:', found);
  } catch (e) {
    console.error('Probe failed:', e.message);
  }
}
probe();
