'use client';
const { ODataClient } = require('./src/lib/odata');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };
  const client = new ODataClient(config);
  try {
    const data = await client.request('DimStructureElementPath?$top=5');
    console.log('Sample Path:', JSON.stringify(data.value, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
