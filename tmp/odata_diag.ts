import { ODataClient } from './src/lib/odata';
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
    console.log('Result:', taskCount);

    console.log('\n2. Testing Task Count for 2019...');
    const task2019 = await client.getCount("FactTask?$filter=RequestedDate ge 2019-01-01T00:00:00 and RequestedDate lt 2020-01-01T00:00:00");
    console.log('Result (RequestedDate):', task2019);
    
    const task2019Alt = await client.getCount("FactTask?$filter=CreatedDate ge 2019-01-01T00:00:00Z and CreatedDate lt 2020-01-01T00:00:00Z");
    console.log('Result (CreatedDate):', task2019Alt);

    console.log('\n3. Testing OData Aggregation (groupby)...');
    try {
      const agg = await client.request("FactDocument?$apply=groupby((CreatedByStructureElementId),aggregate(Id with countdistinct as count))&$top=5");
      console.log('AGG SUCCESS:', JSON.stringify(agg, null, 2));
    } catch (e) {
      console.log('AGG FAILED (not supported or syntax):', e.message || e);
    }

  } catch (e) {
    console.error('TEST FAILED:', e);
  }
}

test();
