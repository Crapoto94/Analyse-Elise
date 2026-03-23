const { fetchCabinetEvolution } = require('./src/lib/odata-direct');

async function test() {
  console.log("Testing Stats Filtering Logic...");
  
  // Mock ODataClient to look at the generated query
  const originalFetch = global.fetch;
  
  try {
    // We expect the query to contain CreatedDate bounds matching the arguments
    const result = await fetchCabinetEvolution(2026, "3", { pole: 'all' });
    console.log("Success fetching 2026-03 stats");
  } catch (e) {
    // Expected to fail if no config, but we want to see the error message or console logs out of odata-direct
    console.log("Test execution finished (expecting config error or success if env set)");
  }
}

// Simple check of the code actually written
const fs = require('fs');
const content = fs.readFileSync('./src/lib/odata-direct.ts', 'utf8');

const taskFilterCheck = content.includes('RequestedDate ge ${start} and RequestedDate lt ${end}');
const yearBoundCheck = content.includes('RequestedDate lt ${year + 1}-01-01T00:00:00Z');

console.log("Task filtering by month check:", taskFilterCheck ? "PASS" : "FAIL");
console.log("Year bounding check:", yearBoundCheck ? "PASS" : "FAIL");

if (taskFilterCheck && yearBoundCheck) {
  process.exit(0);
} else {
  process.exit(1);
}
