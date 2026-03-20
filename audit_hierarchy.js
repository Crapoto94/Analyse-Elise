const { getODataClient } = require('./lib/odata-node');

async function run() {
  const client = getODataClient();
  
  console.log('--- Hierarchy Audit (L2, L3, L4) ---');
  try {
    const data = await client.request('DimStructureElementPath');
    const hierarchy = {};
    data.value.forEach(v => {
      const l2 = v.Level2 || '(null)';
      const l3 = v.Level3 || '(null)';
      const l4 = v.Level4 || '(null)';
      if (!hierarchy[l2]) hierarchy[l2] = {};
      if (!hierarchy[l2][l3]) hierarchy[l2][l3] = new Set();
      hierarchy[l2][l3].add(l4);
    });

    for (const l2 in hierarchy) {
      console.log(`Pôle (L2): ${l2}`);
      for (const l3 in hierarchy[l2]) {
        console.log(`  DGA (L3): ${l3} (${hierarchy[l2][l3].size} directions)`);
      }
    }
  } catch (e) { console.error(e); }

  console.log('\n--- Mail Counts for 2025 ---');
  try {
    const res = await client.request('FactDocument?$filter=CreatedDateNavigation/TheYear eq 2025&$count=true&$top=0');
    console.log('Total 2025:', res['@odata.count']);
  } catch (e) { console.error(e); }
}

run();
