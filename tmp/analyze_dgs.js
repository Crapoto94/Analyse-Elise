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
  console.log('--- DGS Hierarchy Analysis ---');
  const dgs = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=Level2 eq 'DGS'&$top=100&$select=Id,Level2,Level3,Level4,Level5,Level6,StructureElementTypeKey`);
  
  dgs.value.forEach(p => {
    console.log(`ID: ${p.Id} | Type: ${p.StructureElementTypeKey} | L3: ${p.Level3} | L4: ${p.Level4} | L5: ${p.Level5} | L6: ${p.Level6}`);
  });
}
run();
