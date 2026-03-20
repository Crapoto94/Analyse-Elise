const { getODataClient } = require('./lib/odata-node');

async function run() {
  const client = getODataClient();
  
  console.log('--- Structure Element Types ---');
  try {
    const types = await client.request('DimStructureElementType');
    console.log(JSON.stringify(types, null, 2));
  } catch (e) { console.error('Error types:', e.message); }

  console.log('\n--- Sample Structure Elements (Level 5) ---');
  try {
    const samples = await client.request('DimStructureElementPath?$filter=Level5 ne null&$top=5');
    console.log(JSON.stringify(samples, null, 2));
  } catch (e) { console.error('Error samples:', e.message); }

  console.log('\n--- Aggregation test on FactDocument (Simple) ---');
  try {
    const data = await client.getAggregatedData('FactDocument', 'groupby((CreatedByStructureElementId),aggregate($count as Count))');
    console.log('Success simple groupby. Top 5:', JSON.stringify(data.slice(0, 5), null, 2));
  } catch (e) { console.error('Error simple sum:', e.message); }
}

run();
