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
  '/IVRY/Elise/ODataBi/odata.svc/',
  '/IVRY/Elise/ODataBi/OData.svc/',
];

const usernames = [
  'machevalier@ivry94.fr',
  'machevalier'
];

const password = "J'aime bien le ski";

async function testConnection() {
  console.log('--- Probing OData Connections ---');
  
  for (const hostname of hostnames) {
    for (const path of paths) {
      const url = `https://` + hostname + path;
      for (const username of usernames) {
        const auth = Buffer.from(`${username}:${password}`).toString('base64');
        
        try {
          process.stdout.write(`Testing: ${url} (${username})... `);
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json,application/xml'
            },
          });
          
          console.log(`${response.status} ${response.statusText}`);
          
          if (response.ok || response.status === 401) {
             // 401 is actually good because it means the URL was found!
             console.log(`\x1b[32mPOTENTIAL URL FOUND!\x1b[0m ${url} (Status: ${response.status})`);
             if (response.ok) {
                 console.log("--- SUCCESS! ---");
                 return;
             }
          }
        } catch (error) {
          console.log(`Failed: ${error.message}`);
        }
      }
    }
  }
  
  console.log('--- All probes failed ---');
}

testConnection();
