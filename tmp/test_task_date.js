const https = require('https');

async function testTaskDate() {
  const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
  const makeRequest = (url, name) => {
    return new Promise(resolve => {
        https.get(url, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                console.log(`${name} ->`, res.statusCode, raw.substring(0, 100));
                resolve();
            });
        }).on('error', e => resolve());
    });
  }

  await makeRequest('https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=RequestedDate ge 2019-01-01T00:00:00Z and RequestedDate lt 2020-01-01T00:00:00Z&$count=true&$top=0', 'RequestedDate Z');
  await makeRequest('https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=RequestedDate ge 2019-01-01T00:00:00 and RequestedDate lt 2020-01-01T00:00:00&$count=true&$top=0', 'RequestedDate NO Z');
  
  await makeRequest('https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=DocumentDate ge 2019-01-01T00:00:00Z and DocumentDate lt 2020-01-01T00:00:00Z&$count=true&$top=0', 'DocumentDate Z');

  await makeRequest('https://ville-ivry94.illico.city/AppBI/odata/FactTask?$filter=CreatedDate ge 2019-01-01T00:00:00Z and CreatedDate lt 2020-01-01T00:00:00Z&$count=true&$top=0', 'CreatedDate Z');

}

testTaskDate();
