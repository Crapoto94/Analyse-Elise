const { getODataClient } = require('./lib/odata-node');

async function run() {
  const client = getODataClient();
  
  console.log('--- Fetching all DimStructureElementPath ---');
  try {
    const paths = await client.request('DimStructureElementPath');
    console.log(`Received ${paths.value ? paths.value.length : 0} paths`);
    if (paths.value && paths.value.length > 0) {
      const types = new Set(paths.value.map(p => p.StructureElementTypeKey));
      console.log('Unique types:', Array.from(types));
    }
  } catch (e) { console.error('Error paths:', e.message); }

  console.log('\n--- Count test with $count=true ---');
  try {
    const res = await client.request('FactDocument?$count=true&$top=0');
    console.log('Count res keys:', Object.keys(res));
    console.log('Count value:', res['@odata.count']);
  } catch (e) { console.error('Error count:', e.message); }

  console.log('\n--- Count by Year 2026 ---');
  try {
    const res = await client.request('FactDocument?$filter=CreatedDateNavigation/TheYear eq 2026&$count=true&$top=0');
    console.log('2026 Count:', res['@odata.count']);
  } catch (e) { console.error('Error 2026:', e.message); }
}

run();
