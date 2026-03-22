const { ODataClient } = require('./src/lib/odata');
require('dotenv').config();

// Simulation du odata-direct.ts pour tester fetchDirectHierarchy
async function testHierarchy() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };
  const client = new ODataClient(config);

  const year = 2024;
  console.log(`--- Fetching Hierarchy for ${year} ---`);

  try {
    console.log('1. Fetching States...');
    const statesData = await client.request('DimDocumentState?$select=Id,LabelFrFr');
    console.log(`   States OK (count: ${statesData?.value?.length || 0})`);

    console.log('2. Fetching Paths...');
    const allPaths = await client.requestAll("DimStructureElementPath?$select=StructureElementId,Level2,Level3,Level4,Level5,StructureElementTypeKey");
    console.log(`   Paths OK (count: ${allPaths.length})`);

    console.log('3. Fetching Documents IDs...');
    const startDate = `${year}-01-01T00:00:00Z`;
    const endDate = `${year + 1}-01-01T00:00:00Z`;
    const docs = await client.requestAll(`FactDocument?$filter=CreatedDate ge ${startDate} and CreatedDate lt ${endDate}&$select=CreatedByStructureElementId`);
    console.log(`   Docs OK (count: ${docs.length})`);

  } catch (err) {
    console.error(`\nFAILED:`, err.message);
    if(err.cause) console.error('CAUSE:', err.cause);
  }
}

testHierarchy();
