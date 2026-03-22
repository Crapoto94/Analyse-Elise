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
  const years = [2024, 2025, 2026];
  for (const y of years) {
    const start = `${y}-01-01T00:00:00Z`;
    const end = `${y+1}-01-01T00:00:00Z`;
    
    const countCreated = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument/$count?$filter=CreatedDate ge ${start} and CreatedDate lt ${end}`);
    const countRecord = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument/$count?$filter=RecordDate ge ${start} and RecordDate lt ${end}`);
    
    console.log(`Year ${y}: Created=${countCreated} | Record=${countRecord}`);
  }
}
run();
