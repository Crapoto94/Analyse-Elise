
require('dotenv').config();
const axios = require('axios');

async function listCollections() {
  const auth = Buffer.from(`${process.env.ODATA_USERNAME}:${process.env.ODATA_PASSWORD}`).toString('base64');
  const url = process.env.ODATA_URL;

  try {
    console.log('Fetching OData Collections from:', url);
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    const collections = (response.data.value || []).map(c => c.name);
    console.log('--- OData Collections ---');
    console.log(collections);
    
    // Search for "Custom" or "Thesaurus"
    const matches = collections.filter(c => c.toLowerCase().includes('custom') || c.toLowerCase().includes('thesaurus'));
    console.log('--- Potential Custom Collections ---');
    console.log(matches);

  } catch (err) {
    console.error('Error:', err.message);
  }
}

listCollections();
