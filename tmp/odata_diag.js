const { ODataClient } = require('./src/lib/odata');
require('dotenv').config();

async function test() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };
  const client = new ODataClient(config);

  try {
    console.log('1. Testing Global Task Count...');
    const taskCount = await client.getCount('FactTask');
    console.log('Global Task Count:', taskCount);

    console.log('\n2. Testing Task Count for 2019...');
    try {
        const task2019 = await client.getCount("FactTask?$filter=RequestedDate ge 2019-01-01T00:00:00 and RequestedDate lt 2020-01-01T00:00:00");
        console.log('2019 (RequestedDate):', task2019);
    } catch(e) { console.log('2019 RequestedDate failed:', e.message); }

    try {
        const task2019Alt = await client.getCount("FactTask?$filter=CreatedDate ge 2019-01-01T00:00:00Z and CreatedDate lt 2020-01-01T00:00:00Z");
        console.log('2019 (CreatedDate):', task2019Alt);
    } catch(e) { console.log('2019 CreatedDate failed:', e.message); }

    console.log('\n3. Testing Task Count for 2024 (CreatedDate)...');
    try {
        const task2024 = await client.getCount("FactTask?$filter=CreatedDate ge 2024-01-01T00:00:00Z and CreatedDate lt 2025-01-01T00:00:00Z");
        console.log('2024 (CreatedDate):', task2024);
    } catch(e) { console.log('2024 CreatedDate failed:', e.message); }

    console.log('\n4. Testing Aggregation...');
    try {
      const agg = await client.request("FactDocument?$apply=groupby((CreatedByStructureElementId),aggregate(Id with countdistinct as count))&$top=5");
      console.log('AGG SUCCESS:', JSON.stringify(agg, null, 2));
    } catch (e) {
      console.log('AGG NOT SUPPORTED:', e.message || e);
    }

  } catch (e) {
    console.error('DIAGNOSTIC FAILED:', e);
  }
}

test();
