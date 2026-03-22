const { ODataClient } = require('./src/lib/odata');
require('dotenv').config();

async function profile() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };
  const client = new ODataClient(config);

  console.log('--- Profiling OData Calls (Year 2026) ---');

  const startDocs = Date.now();
  const filterDoc = encodeURIComponent(`CreatedDate ge 2026-01-01T00:00:00Z and CreatedDate lt 2027-01-01T00:00:00Z`);
  const docs = await client.requestAll(`FactDocument?$filter=${filterDoc}&$select=Id`);
  console.log(`FactDocument (3294 docs): ${Date.now() - startDocs}ms`);

  const startTasks = Date.now();
  const filterTask = encodeURIComponent(`RequestedDate ge 2026-01-01T00:00:00Z and RequestedDate lt 2027-01-01T00:00:00Z and TaskProcessingTypeId eq 114`);
  const tasks = await client.requestAll(`FactTask?$filter=${filterTask}&$select=DocumentId,AssignedToStructureElementId,TaskNumber`);
  console.log(`FactTask (approx 3500 items): ${Date.now() - startTasks}ms`);

  const startPaths = Date.now();
  const paths = await client.requestAll(`DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey`);
  console.log(`DimStructureElementPath (Full Hierarchy): ${Date.now() - startPaths}ms`);

  console.log('\nTotal time for these 3 main blocks: ', (Date.now() - startDocs), 'ms');
}

profile();
