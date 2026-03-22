const { fetchDirectStats } = require('./src/lib/odata-direct');
require('dotenv').config();

async function test() {
  try {
    console.log('--- TESTING STATS (Global 2026) ---');
    const stats = await fetchDirectStats(2026, 'all', { status: 'all' });
    console.log('RESULT:', JSON.stringify(stats, null, 2));

    console.log('\n--- TESTING STATS (With Pole Cabinet) ---');
    const statsPole = await fetchDirectStats(2026, 'all', { pole: 'CABINET DU MAIRE - CONSEILLERS MUNICIPAUX', status: 'all' });
    console.log('RESULT POLE:', JSON.stringify(statsPole, null, 2));

  } catch (e) {
    console.error('TEST FAILED:', e);
  }
}

test();
