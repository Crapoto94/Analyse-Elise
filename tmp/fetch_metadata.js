
require('dotenv').config();
const { getODataClient } = require('../src/lib/odata');
const fs = require('fs');

async function test() {
  const config = {
    url: process.env.ODATA_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };
  
  const client = getODataClient(config);
  try {
    console.log('Fetching $metadata...');
    const metadata = await client.request('$metadata');
    fs.writeFileSync('tmp/metadata.xml', metadata);
    console.log('Metadata saved to tmp/metadata.xml');
    
    if (metadata.includes('Municipalit')) {
      console.log('FOUND "Municipalit" in metadata!');
    } else {
      console.log('"Municipalit" not found in metadata.');
    }
  } catch (err) {
    console.error('Error fetching metadata:', err.message);
  }
}

test();
