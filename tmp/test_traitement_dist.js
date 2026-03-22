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
  const filter = encodeURIComponent('RequestedDate ge 2026-01-01T00:00:00Z and RequestedDate lt 2027-01-01T00:00:00Z and TaskProcessingTypeId eq 114');
  
  let allTasks = [];
  let nextUrl = `https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=${filter}&$select=DocumentId,AssignedToStructureElementId`;
  while (nextUrl) {
    const resp = await getOData(nextUrl);
    allTasks = allTasks.concat(resp.value || []);
    nextUrl = resp['@odata.nextLink'] || null;
  }
  console.log('Total tasks (Traitement) loaded:', allTasks.length);
  
  const docsByElement = {};
  const totalUniqueDocs = new Set();
  allTasks.forEach(t => {
    const key = t.AssignedToStructureElementId;
    if (!docsByElement[key]) docsByElement[key] = new Set();
    docsByElement[key].add(t.DocumentId);
    totalUniqueDocs.add(t.DocumentId);
  });
  
  console.log('Total unique documents (Traitement):', totalUniqueDocs.size);

  // Distribution par Pôle (pour vérif rapide)
  // On va charger juste les Level2 des pôles
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
  Object.entries(docsByElement).forEach(([id, docSet]) => {
    const path = pathById[parseInt(id)];
    if (path && path.Level2) {
      const pole = path.Level2.trim();
      if (!poleCount[pole]) poleCount[pole] = new Set();
      docSet.forEach(did => poleCount[pole].add(did));
    }
  });

  console.log('\nDistribution par Pôle (Traitement):');
  Object.entries(poleCount)
    .sort((a,b) => b[1].size - a[1].size)
    .forEach(([pole, set]) => console.log(`  ${pole}: ${set.size}`));
}
run();
