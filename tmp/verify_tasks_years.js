const { fetchDirectStats } = require('./src/lib/odata-direct');
require('dotenv').config();

async function test() {
  try {
    console.log('--- TESTING TASKS (2019) ---');
    const stats = await fetchDirectStats(2019, 'all', { status: 'all' });
    console.log('2019 Stats:', { totalDocs: stats.totalDocs, totalTasks: stats.totalTasks });

    console.log('\n--- TESTING TASKS (2024) ---');
    const stats24 = await fetchDirectStats(2024, 'all', { status: 'all' });
    console.log('2024 Stats:', { totalDocs: stats24.totalDocs, totalTasks: stats24.totalTasks });
  } catch (e) {
    console.error('TEST FAILED:', e);
  }
}
test();
