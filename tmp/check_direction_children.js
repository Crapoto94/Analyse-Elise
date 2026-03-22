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
  console.log('--- Children of a Direction ---');
  // On liste tout ce qui est dans la Direction "DIRECTION GENERALE DES SERVICES" (si elle existe ainsi)
  // Ou on cherche une direction avec plusieurs services
  const dirs = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=Level4 ne null&$top=100&$select=Level2,Level3,Level4`);
  const uniqueDirs = Array.from(new Set(dirs.value.map(d => d.Level4)));
  console.log('Unique Directions:', uniqueDirs);

  const targetDir = uniqueDirs[0]; // On en prend une
  process.stdout.write(`\nChildren of Direction: ${targetDir}\n`);
  const children = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/DimStructureElementPath?$filter=Level4 eq '${targetDir.replace(/'/g, "''")}'&$top=100`);
  children.value.forEach(p => {
    console.log(`L5: ${p.Level5} | L6: ${p.Level6} | Type: ${p.StructureElementTypeKey}`);
  });
}
run();
