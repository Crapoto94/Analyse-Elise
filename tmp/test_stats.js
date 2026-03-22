const { fetchDirectStats } = require('./src/lib/odata-direct');
require('dotenv').config();

async function test() {
  try {
    const stats = await fetchDirectStats(2026, 'all', { status: '44' });
    console.log('STATS SUMMARY (Status 44):', {
      totalDocs: stats.totalDocs,
      evolutionCount: stats.monthlyEvolution?.length,
    });
    
    const sums = stats.monthlyEvolution.reduce((acc, cur) => ({
      courriers: acc.courriers + (cur.courriers || 0),
      courriels: acc.courriels + (cur.courriels || 0)
    }), { courriers: 0, courriels: 0 });
    
    console.log('SUMS (Status 44):', sums);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
}

test();
