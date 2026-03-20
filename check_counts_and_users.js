const { getODataClient } = require('./lib/odata-node');

async function run() {
  const client = getODataClient();
  if (!client) {
    console.error('No OData client');
    return;
  }

  console.log('--- Mail count by Level 2 (Pôle) ---');
  try {
    const dataL2 = await client.getAggregatedData('FactDocument', 'groupby((CreatedByStructureElement/DimStructureElementPathIdNavigation/Level2),aggregate($count as Count))');
    console.log(JSON.stringify(dataL2, null, 2));
  } catch (e) { console.error('Error L2:', e.message); }

  console.log('\n--- Checking Level 6 and 7 ---');
  try {
    const dataLevels = await client.getAggregatedData('DimStructureElementPath', 'groupby((Level5,Level6,Level7))');
    const withL6 = dataLevels.filter(d => d.Level6);
    console.log(`Found ${withL6.length} entries with Level 6`);
    if (withL6.length > 0) {
      console.log('First 5 entries with L6:', JSON.stringify(withL6.slice(0, 5), null, 2));
    }
  } catch (e) { console.error('Error levels:', e.message); }
}

run();
