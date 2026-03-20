const url = 'https://ville-ivry94.illico.city/IVRY/ODataBi/odata/';
const username = 'machevalier@ivry94.fr';
const password = "J'aime bien le ski";

async function testConnection() {
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  console.log(`Testing: ${url} (User: ${username})...`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      },
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    if (response.ok) {
        const data = await response.json();
        console.log("SUCCESS! OData Service Root found.");
        console.log("Entities found:", data.value.map(e => e.name).join(', '));
    }
  } catch (error) {
    console.log(`Failed: ${error.message}`);
  }
}

testConnection();
