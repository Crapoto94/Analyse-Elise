const https = require('https');
const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
const getOData = (url) => new Promise(resolve => {
  https.get(url, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { resolve({error: raw.substring(0,200)}); }});
  });
});

async function requestAll(url) {
  let results = [];
  let next = url;
  while (next) {
    const resp = await getOData(next);
    results = results.concat(resp.value || []);
    next = resp['@odata.nextLink'];
  }
  return results;
}

async function run() {
  console.log('--- Simulation: Unicité d\'affectation pour les Courriers CRÉÉS en 2026 ---');
  
  // 1. Get all documents created in 2026
  const docs = await requestAll("https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=CreatedDate ge 2026-01-01T00:00:00Z and CreatedDate lt 2027-01-01T00:00:00Z&$select=Id");
  const yearDocIds = new Set(docs.map(d => d.Id));
  console.log('Total documents created in 2026:', yearDocIds.size);

  // 2. Get all treatment tasks requested in 2026 (or slightly after)
  // We'll take a large window to be sure.
  const tasks = await requestAll("https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=TaskProcessingTypeId eq 114 and RequestedDate ge 2026-01-01T00:00:00Z&$select=DocumentId,AssignedToStructureElementId,TaskNumber&$orderby=TaskNumber");
  console.log('Total Treatment tasks loaded:', tasks.length);

  // 3. Keep only tasks for our 2026 documents
  const filteredTasks = tasks.filter(t => yearDocIds.has(t.DocumentId));
  console.log('Tasks related to 2026 documents:', filteredTasks.length);

  // 4. One assignment per Doc
  const docToElement = new Map();
  filteredTasks.forEach(t => {
    if (!docToElement.has(t.DocumentId)) {
      docToElement.set(t.DocumentId, t.AssignedToStructureElementId);
    }
  });
  console.log('Unique 2026 documents with an assignment:', docToElement.size);

  // 5. Distribution by Pole
  const paths = await requestAll('https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$select=Id,Level2');
  const pathById = {};
  paths.forEach(p => pathById[p.Id] = p);

  const poleCount = {};
  docToElement.forEach((eid) => {
    const path = pathById[eid];
    const pole = (path?.Level2 || 'Inconnu').trim();
    poleCount[pole] = (poleCount[pole] || 0) + 1;
  });

  console.log('\nFinal Distribution 2026:');
  let sum = 0;
  Object.entries(poleCount).sort((a,b) => b[1]-a[1]).forEach(([p, c]) => {
    console.log(`  ${p}: ${c}`);
    sum += c;
  });
  console.log('Total distributed:', sum);
}
run();
