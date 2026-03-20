const https = require('https');

const username = 'User_StatBI';
const password = '2V.}dyRB,8P9h6]8=Fte';
const baseUrl = 'https://ville-ivry94.illico.city/AppBI/odata/';

const auth = Buffer.from(`${username}:${password}`).toString('base64');

async function testQuery(path) {
  console.log(`\n--- ${path} ---`);
  return new Promise((resolve) => {
    const options = {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    };
    https.get(baseUrl + path, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.value) {
            json.value.slice(0, 20).forEach(v => console.log(JSON.stringify(v)));
          } else {
            console.log(JSON.stringify(json).slice(0, 500));
          }
          resolve(json);
        } catch (e) {
          console.log(`Error: ${e.message}`);
          resolve(null);
        }
      });
    }).on('error', (err) => resolve(null));
  });
}

async function runTests() {
  await testQuery('ParamCustomDim');
  await testQuery('DimStructureElementType');
  await testQuery('DimStructureElement?$top=5');
}

runTests();
