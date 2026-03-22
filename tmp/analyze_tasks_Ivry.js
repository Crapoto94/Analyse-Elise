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
  const filter = encodeURIComponent('RequestedDate ge 2026-03-01T00:00:00Z');
  const tasks = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=${filter}&$top=20&$select=Id,DocumentId,ProcessingTypeId,SubProcessingTypeId,AssignedToStructureElementId,RequestedDate`);
  
  if (tasks.value) {
    console.log('Sample Tasks March 2026:');
    tasks.value.forEach(t => {
      console.log(`  Doc ${t.DocumentId} | Task ${t.Id} | ProcType: ${t.ProcessingTypeId} | SubProc: ${t.SubProcessingTypeId} | AssignedTo: ${t.AssignedToStructureElementId}`);
    });
  } else {
    console.log('Error:', tasks);
  }
  
  const procTypes = await getOData('https://ville-ivry94.illico.city/AppBI/odata/DimTaskProcessingType?$select=Id,LabelFrFr');
  console.log('\nProcessing Types:', procTypes.value);
}
run();
