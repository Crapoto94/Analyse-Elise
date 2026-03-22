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
  console.log('--- Users in a Direction ---');
  // On cible une direction connue
  const targetDir = "DIRECTION DU CCAS";
  const users = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=Level4 eq '${targetDir.replace(/'/g, "''")}' and StructureElementTypeKey eq 'USER'&$top=50`);
  users.value.forEach(p => {
    console.log(`ID: ${p.Id} | L4: ${p.Level4} | L5: ${p.Level5} | L6: ${p.Level6} | Type: ${p.StructureElementTypeKey}`);
  });
}
run();
