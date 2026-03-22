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
  const dates = ['2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-20', '2026-03-21'];
  for (const d of dates) {
    const start = `${d}T00:00:00Z`;
    const end = `${d}T23:59:59Z`;
    const nextDay = `${d.substring(0,8)}${(parseInt(d.substring(8))+1).toString().padStart(2,'0')}T00:00:00Z`;
    
    const count = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument/$count?$filter=CreatedDate ge ${start} and CreatedDate lt ${nextDay}`);
    console.log(`${d}: ${count} docs`);
  }
}
run();
