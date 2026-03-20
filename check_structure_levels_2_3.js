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
            const l1 = new Set();
            const l2 = new Set();
            const l3 = new Set();
            const l4 = new Set();
            const l5 = new Set();
            json.value.forEach(v => {
              if (v.Level1) l1.add(v.Level1);
              if (v.Level2) l2.add(v.Level2);
              if (v.Level3) l3.add(v.Level3);
              if (v.Level4) l4.add(v.Level4);
              if (v.Level5) l5.add(v.Level5);
            });
            console.log("Distinct Level1 values:");
            Array.from(l1).sort().forEach(l => console.log(`- ${l}`));
            console.log("\nDistinct Level2 values:");
            Array.from(l2).sort().forEach(l => console.log(`- ${l}`));
            console.log("\nDistinct Level3 values:");
            Array.from(l3).sort().forEach(l => console.log(`- ${l}`));
            console.log("\nDistinct Level4 values:");
            Array.from(l4).sort().forEach(l => console.log(`- ${l}`));
            console.log("\nDistinct Level5 values:");
            Array.from(l5).sort().forEach(l => console.log(`- ${l}`));
          }
          resolve(json);
        } catch (e) { resolve(null); }
      });
    }).on('error', (err) => resolve(null));
  });
}

async function runTests() {
  const json = await testQuery('DimStructureElementPath');
  if (json && json.value) {
    console.log("\n--- Paths with 'DIRECTION' in Level 3 ---");
    const dirInL3 = json.value.filter(v => v.Level3 && v.Level3.includes('DIRECTION'));
    dirInL3.forEach(v => console.log(`Path: ${v.Level1} > ${v.Level2} > ${v.Level3}`));
    
    console.log("\n--- Paths with 'DIRECTION' in Level 4 ---");
    const dirInL4 = json.value.filter(v => v.Level4 && v.Level4.includes('DIRECTION'));
    dirInL4.forEach(v => console.log(`Path: ${v.Level1} > ${v.Level2} > ${v.Level3} > ${v.Level4}`));
  }
}

runTests();
