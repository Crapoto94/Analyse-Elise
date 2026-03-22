const https = require('https');
const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
const getOData = (url) => new Promise(resolve => {
  https.get(url, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { resolve({error: raw.substring(0,200)}); }});
  });
});

async function run() {
  console.log('--- Simulation: Unicité d\'affectation par Document Créé en 2026 ---');
  
  // 1. Get all documents created in 2026
  const docs = await getOData("https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=CreatedDate ge 2026-01-01T00:00:00Z and CreatedDate lt 2027-01-01T00:00:00Z&$select=Id");
  const yearDocIds = new Set(docs.value.map(d => d.Id));
  console.log('Total documents created in 2026:', yearDocIds.size);

  // 2. Load all Treatment tasks for the year (to cover these docs)
  // Note: We might need tasks requested in 2026 OR slightly after for these docs.
  // Actually, loading all 114 tasks for the year is a good proxy.
  let allTasks = [];
  let nextUrl = "https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=TaskProcessingTypeId eq 114&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber";
  // To avoid loading too much, we limit to the year proxy
  nextUrl += ` and RequestedDate ge 2026-01-01T00:00:00Z and RequestedDate lt 2027-01-01T00:00:00Z`;

  while (nextUrl) {
    const resp = await getOData(nextUrl);
    allTasks = allTasks.concat(resp.value || []);
    nextUrl = resp['@odata.nextLink'] || null;
  }
  console.log('Total tasks (Traitement 2026) loaded:', allTasks.length);

  // 3. Keep only ONE assignment per Document (the first one by TaskNumber)
  const docToElement = new Map();
  allTasks.forEach(t => {
    if (yearDocIds.has(t.DocumentId)) {
      if (!docToElement.has(t.DocumentId)) {
        docToElement.set(t.DocumentId, t.AssignedToStructureElementId);
      }
    }
  });
  console.log('Documents with at least one treatment task:', docToElement.size);

  // 4. Distribution par Pôle
  let allPaths = [];
  let nextPath = 'https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$select=Id,Level2';
  while (nextPath) {
    const resp = await getOData(nextPath);
    allPaths = allPaths.concat(resp.value || []);
    nextPath = resp['@odata.nextLink'] || null;
  }
  const pathById = {};
  allPaths.forEach(p => pathById[p.Id] = p);

  const poleCount = {};
  docToElement.forEach((elementId, docId) => {
    const path = pathById[elementId];
    const pole = (path?.Level2 || 'Inconnu').trim();
    poleCount[pole] = (poleCount[pole] || 0) + 1;
  });

  console.log('\nDistribution (One-per-Doc):');
  let sum = 0;
  Object.entries(poleCount).sort((a,b) => b[1] - a[1]).forEach(([p, c]) => {
    console.log(`  ${p}: ${c}`);
    sum += c;
  });
  console.log('Total distributed:', sum);
}
run();
