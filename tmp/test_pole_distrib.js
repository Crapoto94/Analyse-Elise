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
  // Compter les tâches par AssignedToStructureElementId pour 2026, puis mapper vers la hiérarchie
  const filter = encodeURIComponent('RequestedDate ge 2026-01-01T00:00:00Z and RequestedDate lt 2027-01-01T00:00:00Z');
  
  // Charger toutes les tâches (pagination)
  let allTasks = [];
  let nextUrl = `https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=${filter}&$select=DocumentId,AssignedToStructureElementId`;
  while (nextUrl) {
    const resp = await getOData(nextUrl);
    allTasks = allTasks.concat(resp.value || []);
    nextUrl = resp['@odata.nextLink'] || null;
  }
  console.log('Total tasks loaded:', allTasks.length);
  
  // Compter les documents UNIQUES par AssignedToStructureElementId
  const docsByElement = {};
  allTasks.forEach(t => {
    const key = t.AssignedToStructureElementId;
    if (!docsByElement[key]) docsByElement[key] = new Set();
    docsByElement[key].add(t.DocumentId);
  });
  
  // Top 10 éléments
  const top = Object.entries(docsByElement)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10);
  
  console.log('\nTop 10 AssignedTo elements by unique document count:');
  for (const [id, docs] of top) {
    const path = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=${encodeURIComponent('Id eq ' + id)}&$select=Id,Level2,Level3,Level4,Level5,StructureElementTypeKey`);
    if (path.value && path.value.length > 0) {
      const p = path.value[0];
      console.log(`  Id ${id}: ${docs.size} docs -> Type: ${p.StructureElementTypeKey}, L2: ${p.Level2}, L3: ${p.Level3}`);
    } else {
      console.log(`  Id ${id}: ${docs.size} docs -> NO PATH FOUND`);
    }
  }
  
  // Calculer la répartition par Pôle (Level2)
  console.log('\n--- Répartition par Pôle (Level2) ---');
  
  // Charger les paths
  let allPaths = [];
  let nextPath = 'https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$select=Id,Level2,StructureElementTypeKey';
  while (nextPath) {
    const resp = await getOData(nextPath);
    allPaths = allPaths.concat(resp.value || []);
    nextPath = resp['@odata.nextLink'] || null;
  }
  console.log('Total paths loaded:', allPaths.length);
  
  const pathById = {};
  allPaths.forEach(p => { pathById[p.Id] = p; });
  
  const poleCount = {};
  let totalUniqueDocs = new Set();
  Object.entries(docsByElement).forEach(([elemId, docSet]) => {
    const path = pathById[parseInt(elemId)];
    if (path && path.Level2) {
      const pole = path.Level2.trim();
      if (!poleCount[pole]) poleCount[pole] = new Set();
      docSet.forEach(docId => {
        poleCount[pole].add(docId);
        totalUniqueDocs.add(docId);
      });
    }
  });
  
  console.log(`Total unique docs assigned: ${totalUniqueDocs.size}`);
  Object.entries(poleCount)
    .sort((a, b) => b[1].size - a[1].size)
    .forEach(([pole, docs]) => console.log(`  ${pole}: ${docs.size} docs`));
}
run();
