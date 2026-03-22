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
    const data = await client.request('FactDocument?$top=10');
    console.log('Keys:', Object.keys(data));
    console.log('NextLink:', data['@odata.nextLink']);
  } catch (e) {
    console.error(e);
  }
}
test();
