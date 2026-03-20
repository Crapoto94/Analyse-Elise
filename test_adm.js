const fs = require('fs');
const hostnames = [
  'ville-ivry94.illico.city',
  'ivry94.illico.city',
  'elise.illico.city',
];

const paths = [
  '/IVRY/Elise/ODataBi/odata/',
  '/IVRY/Elise/ODataBi/OData/',
  '/IVRY/ODataBi/odata/',
  '/IVRY/ODataBi/OData/',
  '/IVRY/Elise/odata/',
  '/IVRY/Elise/OData/',
  '/IVRY/odata/',
  '/IVRY/OData/',
  '/Elise/ODataBi/odata/',
  '/ODataBi/odata/',
  '/AppBI/odata/',
];

const usernames = [
  'ADM_STATS',
  'IVRY94\\ADM_STATS',
  'adm_stats@ivry94.fr',
  'ADM_STATS@ivry94.fr'
];

const password = "12345";
let logs = [];
function log(msg) { logs.push(msg); }

async function testConnection() {
  log('--- Probing OData Connections with ADM_STATS ---');
  
  for (const hostname of hostnames) {
    for (const path of paths) {
      const url = `https://${hostname}${path}`;
      for (const username of usernames) {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json,application/xml'
            },
          });
          
          if (response.ok || response.status === 401 || response.status === 403) {
             log(`INTEREST: ${url} (User: ${username}) -> Status: ${response.status}`);
             if (response.ok) {
                 log(`--- SUCCESS on ${url} with ${username}! ---`);
                 try {
                     const data = await response.json();
                     if (data && data.value) {
                         log("Entities: " + data.value.map(e => e.name).join(', '));
                     }
                 } catch (e) {
                     log("Could not parse JSON response");
                 }
             }
          } else {
             log(`Failed (HTTP ${response.status}): ${url} (${username})`);
          }
        } catch (error) {
           log(`Network Error: ${url} (${username}) -> ${error.message}`);
        }
      }
    }
  }
  
  log('--- Finished probing ---');
  fs.writeFileSync('test_results_adm.txt', logs.join('\n'));
}

testConnection();
