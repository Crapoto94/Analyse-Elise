const { ODataClient } = require('./src/lib/odata');
const fs = require('fs');
require('dotenv').config();

async function probe() {
  const config = {
    baseUrl: process.env.ODATA_BASE_URL,
    username: process.env.ODATA_USERNAME,
    password: process.env.ODATA_PASSWORD
  };

  const client = new ODataClient(config);
  try {
    console.log('Probing OData structure elements...');
    const paths = await client.requestAll('DimStructureElementPath?$select=Level2&$top=100');
    const levels = new Set(paths.map(p => p.Level2).filter(Boolean));
    console.log('Unique Level2 values found:');
    levels.forEach(l => console.log(`- "${l}"`));
    
    const muniMatches = Array.from(levels).filter(l => l.toUpperCase().includes('CABINET'));
    console.log('\nMatches for "CABINET":');
    muniMatches.forEach(l => console.log(`- "${l}"`));
  } catch (err) {
    console.error('Error probing OData:', err.message);
  }
}

probe();
