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
  // 1. Get 5 documents created in 2026
  const docs = await getOData("https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=CreatedDate ge 2026-01-01T00:00:00Z&$top=5&$select=Id,DocumentIdentifier,CreatedDate");
  console.log('Sample Docs 2026:', docs.value);

  for (const doc of docs.value) {
    console.log(`\nTasks for ${doc.DocumentIdentifier} (ID ${doc.Id}):`);
    const tasks = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=DocumentId eq ${doc.Id}&$select=TaskNumber,TaskProcessingTypeId,AssignedToStructureElementId,AssignedToStructureElementName,RequestedDate&$orderby=TaskNumber`);
    
    tasks.value.forEach(t => {
      console.log(`  #${t.TaskNumber} | ProcType: ${t.TaskProcessingTypeId} | AssignedTo: ${t.AssignedToStructureElementName} (${t.AssignedToStructureElementId}) | Date: ${t.RequestedDate}`);
    });
  }
}
run();
