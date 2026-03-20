const fs = require('fs');

const urls = [
  'https://ville-ivry94.illico.city/IVRY/Elise/ODataBi/odata/',
  'https://ville-ivry94.illico.city/IVRY/ODataBi/odata/',
  'https://ville-ivry94.illico.city/Elise/ODataBi/odata/',
  'https://ville-ivry94.illico.city/ODataBi/odata/',
  'https://ville-ivry94.illico.city/IVRY/Elise/OData/',
  'https://ville-ivry94.illico.city/IVRY/OData/',
  'https://ville-ivry94.illico.city/Elise/OData/',
  'https://ville-ivry94.illico.city/odata/',
  'https://ville-ivry94.illico.city/IVRY/Elise/ODataBi/',
  'https://ville-ivry94.illico.city/IVRY/ODataBi/',
  'https://ville-ivry94.illico.city/IVRY/Elise/',
];

const usernames = [
  'machevalier@ivry94.fr',
  'machevalier'
];

const password = "J'aime bien le ski";

async function testConnection() {
  let log = '--- Testing OData Connections ---\n';
  
  for (const url of urls) {
    for (const username of usernames) {
      const auth = Buffer.from(`${username}:${password}`).toString('base64');
      
      try {
        log += `Testing: ${url} (User: ${username})... `;
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json'
          },
        });
        
        log += `${response.status} ${response.statusText}\n`;
        
        if (response.ok) {
          log += `SUCCESS! URL: ${url}, User: ${username}\n`;
        }
      } catch (error) {
        log += `Failed: ${error.message}\n`;
      }
    }
  }
  
  fs.writeFileSync('test_results.txt', log);
  console.log('Test completed. Results in test_results.txt');
}

testConnection();
