// Probe AppBI OData paths with confirmed credentials
const username = 'machevalier@ivry94.fr';
const password = "J'aime bien le ski";
const auth = Buffer.from(`${username}:${password}`).toString('base64');

const paths = [
  '/AppBI/odata/',
  '/AppBI/odata/v1/',
  '/AppBI/odata/v4/',
  '/AppBI/api/odata/',
  '/AppBI/OData/',
  '/IVRY/Elise/AppBI/odata/',
  '/AppBI/',
  '/AppBI/api/',
  // Try with API key header instead of Basic Auth
];

async function testPath(url, extraHeaders = {}) {
  try {
    process.stdout.write(`Testing: ${url}... `);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        ...extraHeaders
      },
    });
    const text = await response.text();
    console.log(`${response.status} ${response.statusText}`);
    if (response.ok) {
      console.log('\x1b[32mSUCCESS!\x1b[0m', text.substring(0, 300));
    }
    if (response.status === 401) {
      const wwwAuth = response.headers.get('WWW-Authenticate');
      console.log('  WWW-Authenticate:', wwwAuth);
    }
  } catch (error) {
    console.log(`Network Error: ${error.message}`);
  }
}

async function run() {
  const base = 'https://ville-ivry94.illico.city';
  for (const path of paths) {
    await testPath(base + path);
  }

  // Also try Bearer token style with email as token
  console.log('\n--- Testing Bearer token approach ---');
  await testPath('https://ville-ivry94.illico.city/AppBI/odata/', {
    'Authorization': `Bearer ${Buffer.from(username).toString('base64')}`,
  });

  // Try X-API-Key header
  await testPath('https://ville-ivry94.illico.city/AppBI/odata/', {
    'Authorization': '',
    'X-Api-Key': password,
  });
}

run();
