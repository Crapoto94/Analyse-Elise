const https = require('https');

async function testTaskCount24() {
  const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
  const url = 'https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=RequestedDate ge 2024-01-01T00:00:00Z and RequestedDate lt 2025-01-01T00:00:00Z&$count=true&$top=0';
  
  https.get(url, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => console.log('Tasks 2024 ->', res.statusCode, raw));
  }).on('error', e => console.log('Err:', e));
}

testTaskCount24();
