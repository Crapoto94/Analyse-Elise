const { ODataClient } = require('./src/lib/odata');
require('dotenv').config();

async function test() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };
  console.log('Testing with current .env config:', { ...config, password: '***' });
  const client = new ODataClient(config);
  try {
    const data = await client.request('DimDocumentState?$top=1');
    console.log('SUCCESS:', data);
  } catch (e) {
    console.error('FAILED:', e.message || e);
  }
}

test();
