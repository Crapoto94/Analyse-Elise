const https = require('https');

const username = 'User_StatBI';
const password = '2V.}dyRB,8P9h6]8=Fte';
const baseUrl = 'https://ville-ivry94.illico.city/AppBI/odata/';

const auth = Buffer.from(`${username}:${password}`).toString('base64');

async function testQuery(path) {
  console.log(`Testing: ${path}`);
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
          console.log(`Status: ${res.statusCode}`);
          if (json.value) {
            console.log(`Count/Value: ${json.value.length || 'N/A'}`);
            if (json.value.length > 0) console.log('Sample:', JSON.stringify(json.value[0]).slice(0, 200));
          } else if (json['@odata.count'] !== undefined) {
             console.log(`OData Count: ${json['@odata.count']}`);
          } else {
            console.log('Response:', data.slice(0, 200));
          }
          resolve(json);
        } catch (e) {
          console.log(`Error parsing JSON: ${e.message}`);
          console.log('Raw:', data.slice(0, 500));
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error('Request error:', err.message);
      resolve(null);
    });
  });
}

async function runTests() {
  // 1. Test standard count
  await testQuery('FactDocument?$count=true&$top=0');
  
  // 2. Test $apply aggregation
  await testQuery('FactDocument?$apply=aggregate(Id with countdistinct as Total)');
  
  // 3. Test Direction values
  await testQuery('DimDocumentDirection');

  // 4. Test Medium values
  await testQuery('DimDocumentMedium');

  // 5. Test Type values
  await testQuery('DimDocumentType?$top=5');
}

runTests();
