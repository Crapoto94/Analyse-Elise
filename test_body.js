const url = 'https://ville-ivry94.illico.city/IVRY/Elise/';
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
    console.log(`Content-Type: ${response.headers.get('Content-Type')}`);
    
    if (response.ok) {
        const text = await response.text();
        console.log("Body Snippet:", text.substring(0, 500));
    }
  } catch (error) {
    console.log(`Failed: ${error.message}`);
  }
}

testConnection();
