const fetch = require('node-fetch');

async function inspectHierarchy() {
  const year = 2026;
  const baseUrl = 'http://localhost:5002/api/debug/hierarchy'; // I'll check if this exists or use odata directly
  
  // Actually, I'll just look at the code or use the odata client if I could, 
  // but I can just run a script that uses the same logic.
}

// I'll use a safer way: a script that uses prisma to read the cached paths if they were there, 
// or just fetches from the API.
// Let's just use the proxy to get DimStructureElementPath.
async function run() {
  const res = await fetch('http://localhost:5002/api/odata-proxy?query=DimStructureElementPath?$select=Id,Level2,Level3,Level4,Level5,Level6,StructureElementTypeKey');
  const items = (await res.json()).value;
  
  const drh = items.filter(p => p.Level4?.includes('RESSOURCES HUMAINES'));
  console.log('DRH Elements:', drh.length);
  drh.slice(0, 20).forEach(p => {
    console.log(`ID: ${p.Id} | L4: ${p.Level4} | L5: ${p.Level5} | L6: ${p.Level6} | Type: ${p.StructureElementTypeKey}`);
  });
}
run();
