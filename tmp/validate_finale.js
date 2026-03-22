const { fetchDirectStats, fetchDirectHierarchy } = require('./src/lib/odata-direct');
require('dotenv').config();

async function runValidation() {
  console.log('--- STARTING VALIDATION 2024 (25k+ docs) ---');
  try {
    console.log('1. Fetching Hierarchy...');
    const startH = Date.now();
    const hierarchy = await fetchDirectHierarchy(2024);
    const timeH = Date.now() - startH;
    console.log(`Hierarchy fetched in ${timeH}ms`);
    console.log(`- Poles Count: ${hierarchy.poles.length}`);
    console.log(`- Sample Pole:`, hierarchy.poles[0]);

    console.log('\n2. Fetching Stats...');
    const startS = Date.now();
    const stats = await fetchDirectStats(2024, 'all', { status: 'all', pole: 'all', dga: 'all', dir: 'all', service: 'all' });
    const timeS = Date.now() - startS;
    console.log(`Stats fetched in ${timeS}ms`);
    console.log(`- Total Documents: ${stats.totalDocs}`);
    console.log(`- Total Tasks: ${stats.totalTasks}`);
    
    // Quick check on chart
    const paper = stats.monthlyEvolution.reduce((acc, curr) => acc + curr.courriers, 0);
    const email = stats.monthlyEvolution.reduce((acc, curr) => acc + curr.courriels, 0);
    console.log(`- Evolution Breakdown: ${paper} Courriers, ${email} Courriels`);

  } catch (err) {
    console.error('Validation failed with error:', err.message);
  }
}

runValidation();
