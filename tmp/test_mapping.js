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
  // 1. Récupérer les DirectionId distincts des courriers 2026
  const filter = encodeURIComponent('CreatedDate ge 2026-01-01T00:00:00Z and CreatedDate lt 2027-01-01T00:00:00Z');
  const docs = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=${filter}&$select=DirectionId&$top=500`);
  
  const dirIds = {};
  docs.value.forEach(d => { dirIds[d.DirectionId] = (dirIds[d.DirectionId] || 0) + 1; });
  console.log('Distribution DirectionId (top 10):', Object.entries(dirIds).sort((a,b) => b[1]-a[1]).slice(0,10));
  
  // 2. Regarder à quels niveaux correspondent ces DirectionId dans DimStructureElementPath
  const topIds = Object.keys(dirIds).slice(0, 5);
  for (const id of topIds) {
    const path = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=${encodeURIComponent('Id eq ' + id)}&$select=Id,Level1,Level2,Level3,Level4,Level5,StructureElementTypeKey`);
    if (path.value && path.value.length > 0) {
      const p = path.value[0];
      console.log(`DirectionId ${id} (${dirIds[id]} docs) -> Type: ${p.StructureElementTypeKey}, L1: ${p.Level1}, L2: ${p.Level2}, L3: ${p.Level3}, L4: ${p.Level4}`);
    }
  }

  // 3. Chercher aussi DistributedByStructureElementId
  const docs2 = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=${filter}&$select=DistributedByStructureElementId&$top=500`);
  const distIds = {};
  docs2.value.forEach(d => { distIds[d.DistributedByStructureElementId] = (distIds[d.DistributedByStructureElementId] || 0) + 1; });
  console.log('\nDistribution DistributedByStructureElementId (top 10):', Object.entries(distIds).sort((a,b) => b[1]-a[1]).slice(0,10));
  
  const topDistIds = Object.keys(distIds).slice(0, 5);
  for (const id of topDistIds) {
    const path = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=${encodeURIComponent('Id eq ' + id)}&$select=Id,Level1,Level2,Level3,Level4,Level5,StructureElementTypeKey`);
    if (path.value && path.value.length > 0) {
      const p = path.value[0];
      console.log(`DistributedById ${id} (${distIds[id]} docs) -> Type: ${p.StructureElementTypeKey}, L1: ${p.Level1}, L2: ${p.Level2}, L3: ${p.Level3}, L4: ${p.Level4}`);
    }
  }
}
run();
