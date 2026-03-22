const https = require('https');

async function testOdata() {
  const url = 'https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=CreatedDate ge 2024-01-01T00:00:00 and CreatedDate lt 2025-01-01T00:00:00&$top=1';
  const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');

  https.get(url, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => console.log('Without Z ->', res.statusCode, raw.substring(0, 100)));
  }).on('error', e => console.log('Err:', e));

  const urlZ = 'https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=CreatedDate ge 2024-01-01T00:00:00Z and CreatedDate lt 2025-01-01T00:00:00Z&$top=1';
  https.get(urlZ, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => console.log('With Z ->', res.statusCode, raw.substring(0, 100)));
  }).on('error', e => console.log('Err:', e));

  const applyUrl = 'https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$filter=CreatedDate ge 2024-01-01T00:00:00Z and CreatedDate lt 2025-01-01T00:00:00Z&$apply=groupby((CreatedByStructureElementId),aggregate(Id with countdistinct as count))';
  https.get(applyUrl, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => console.log('Aggregation ->', res.statusCode, raw.substring(0, 200)));
  });
}

testOdata();
