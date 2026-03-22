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
  const dates = ['2026-03-07', '2026-03-21'];
  for (const d of dates) {
    console.log(`\n--- Verification for ${d} ---`);
    const start = `${d}T00:00:00Z`;
    const end = `${d}T23:59:59Z`; // Inclusive enough for OData lt/gt
    const nextDay = `${d.substring(0,8)}${(parseInt(d.substring(8))+1).toString().padStart(2,'0')}T00:00:00Z`;
    
    const countCreated = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument/$count?$filter=CreatedDate ge ${start} and CreatedDate lt ${nextDay}`);
    const countRecord = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument/$count?$filter=RecordDate ge ${start} and RecordDate lt ${nextDay}`);
    
    console.log(`  CreatedDate: ${countCreated}`);
    console.log(`  RecordDate:  ${countRecord}`);
    
    if (countCreated > 0) {
      const details = await getOData(`https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=CreatedDate ge ${start} and CreatedDate lt ${nextDay}&$top=5&$select=DocumentIdentifier,CreatedDate`);
      console.log(`  Exemples:`, details.value);
    }
  }
}
run();
