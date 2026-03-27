const { ODataClient } = require('./src/lib/odata');
const dotenv = require('dotenv');
dotenv.config();

async function probe() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD,
  };
  const client = new ODataClient(config);

  console.log('--- Probing DimMedium ---');
  try {
    const mediums = await client.requestAll('DimMedium');
    console.log(JSON.stringify(mediums, null, 2));
  } catch (e) {
    console.log('DimMedium not found or error:', e.message);
  }

  console.log('--- Probing DimDocumentType ---');
  try {
    const types = await client.requestAll('DimDocumentType');
    console.log(JSON.stringify(types.slice(0, 10), null, 2));
  } catch (e) {
    console.log('DimDocumentType error:', e.message);
  }
  
  console.log('--- Probing first 10 FactDocument ---');
  try {
    const docs = await client.request('FactDocument?$top=10');
    console.log(JSON.stringify(docs.value, null, 2));
  } catch (e) {
    console.log('FactDocument error:', e.message);
  }
}

probe();
