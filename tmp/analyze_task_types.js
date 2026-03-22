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
  // 1. Types de tâches
  const types = await getOData('https://ville-ivry94.illico.city/AppBI/odata/DimTaskType?$select=Id,LabelFrFr');
  console.log('Task Types:', types.value);

  // 2. Analyser les tâches d'un document spécifique pour voir la chronologie
  const filter = encodeURIComponent('RequestedDate ge 2026-01-01T00:00:00Z');
  const sample = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=${filter}&$top=1&$select=DocumentId`);
  const docId = sample.value[0].DocumentId;
  
  console.log(`\nTimeline for DocumentId ${docId}:`);
  const timeline = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=DocumentId eq ${docId}&$select=Id,TypeId,AssignedToStructureElementId,RequestedDate&$orderby=RequestedDate`);
  
  for (const t of timeline.value) {
    const type = types.value.find(tt => tt.Id === t.TypeId);
    const path = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=Id eq ${t.AssignedToStructureElementId}&$select=Level2`);
    console.log(`  ${t.RequestedDate} | Type: ${type?.LabelFrFr || t.TypeId} | AssignedTo: ${path.value?.[0]?.Level2 || t.AssignedToStructureElementId}`);
  }
}
run();
