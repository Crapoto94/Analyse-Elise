// Testing OData V4 specific headers
const user = 'machevalier@ivry94.fr';
const password = "J'aime bien le ski";
const auth = Buffer.from(`${user}:${password}`).toString('base64');
const base = 'https://ville-ivry94.illico.city/AppBI/odata/';

async function test(headers = {}) {
  try {
    process.stdout.write(`Testing with extra headers ${JSON.stringify(headers)}: `);
    const response = await fetch(base, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        ...headers
      }
    });
    console.log(`${response.status} ${response.statusText}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

async function run() {
  await test({ 'OData-Version': '4.0' });
  await test({ 'OData-MaxVersion': '4.0' });
  await test({ 'X-Requested-With': 'XMLHttpRequest' });
}

run();
