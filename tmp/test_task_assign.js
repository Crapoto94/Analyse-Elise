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
  // 1. Keys de FactTask
  const task = await getOData('https://ville-ivry94.illico.city/AppBI/odata/FactTask?$top=1');
  console.log('FactTask Keys:', Object.keys(task.value[0]));
  
  // 2. Regarder les colonnes StructureElement de FactTask
  const filter = encodeURIComponent('RequestedDate ge 2026-01-01T00:00:00Z and RequestedDate lt 2027-01-01T00:00:00Z');
  const tasks = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=${filter}&$top=10&$select=Id,AssignedToStructureElementId,CreatedByStructureElementId,RequestedDate`);
  
  if (tasks.value) {
    console.log('\nSample Tasks 2026:');
    const assignedIds = {};
    tasks.value.forEach(t => {
      console.log(`  Task ${t.Id}: AssignedTo=${t.AssignedToStructureElementId}, CreatedBy=${t.CreatedByStructureElementId}`);
      if (t.AssignedToStructureElementId) {
        assignedIds[t.AssignedToStructureElementId] = (assignedIds[t.AssignedToStructureElementId] || 0) + 1;
      }
    });
    
    // 3. Mapper les AssignedToStructureElementId vers la hiérarchie
    for (const id of Object.keys(assignedIds).slice(0, 5)) {
      const path = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=${encodeURIComponent('Id eq ' + id)}&$select=Id,Level1,Level2,Level3,Level4,Level5,StructureElementTypeKey`);
      if (path.value && path.value.length > 0) {
        const p = path.value[0];
        console.log(`  AssignedTo ${id} -> Type: ${p.StructureElementTypeKey}, L2: ${p.Level2}, L3: ${p.Level3}, L4: ${p.Level4}, L5: ${p.Level5}`);
      }
    }
  } else {
    console.log('Error:', tasks);
  }
}
run();
