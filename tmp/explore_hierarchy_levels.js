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
  console.log('--- Inspecting Structure for Direction & Individuals ---');
  // On regarde les types d'éléments de structure
  const types = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$select=StructureElementTypeKey&$top=1000`);
  const typeSet = new Set(types.value.map(t => t.StructureElementTypeKey));
  console.log('Found types:', Array.from(typeSet));

  // On cherche des exemples où Level4 est renseigné mais pas Level5
  const directDir = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=Level4 ne null and Level5 eq null&$top=10&$select=Id,Level4,Level5,StructureElementTypeKey`);
  console.log('Direct Direction examples:', directDir.value);

  // On cherche des exemples de type USER ou AGENT
  const agents = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=StructureElementTypeKey eq 'USER' or StructureElementTypeKey eq 'AGENT'&$top=10&$select=Id,Level4,Level5,Level6,StructureElementTypeKey`);
  console.log('Agent/User examples:', agents.value);
}
run();
