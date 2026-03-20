const { getODataClient } = require('./src/lib/odata');
const fs = require('fs');
const dotenv = require('dotenv');
dotenv.config();

async function probe() {
  const config = {
    ODATA_URL: process.env.ODATA_URL,
    ODATA_USER: process.env.ODATA_USER,
    ODATA_PASS: process.env.ODATA_PASS
  };

  if (!config.ODATA_URL) { console.error('No ODATA_URL'); return; }

  const client = getODataClient(config);
  try {
    const root = await client.request('');
    const names = (root.value || []).map(e => e.name);
    console.log('Entities in OData:', names.join(', '));
    
    const candidates = ['DimDocumentMedium', 'DocumentMedium', 'DimStructureElementPath', 'StructureElementPath'];
    for (const c of candidates) {
      if (names.includes(c)) {
        console.log(`[FOUND] ${c}`);
      }
    }
  } catch (e) {
    console.error('Probe Error:', e.message);
  }
}
probe();
