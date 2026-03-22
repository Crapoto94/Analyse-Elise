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
  console.log('--- Searching for REAL Administrative Directions ---');
  // On cherche des Level4 qui contiennent "DIRECTION"
  const dirs = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=contains(Level4, 'DIRECTION') and StructureElementTypeKey eq 'SERVICE'&$top=50&$select=Level2,Level3,Level4,Level5`);
  dirs.value.forEach(p => {
    console.log(`L2: ${p.Level2} | L3: ${p.Level3} | L4: ${p.Level4} | L5: ${p.Level5}`);
  });
}
run();
