// Testing different username formats and case sensitivity
const password = "J'aime bien le ski";
const base = 'https://ville-ivry94.illico.city/AppBI/odata/';

const users = [
  'MaChevalier',
  'machevalier',
  'machevalier@ivry94.fr',
  'MaChevalier@ivry94.fr',
  'ivry94\\MaChevalier',
  'ivry94\\machevalier',
];

async function test(user) {
  const auth = Buffer.from(`${user}:${password}`).toString('base64');
  try {
    process.stdout.write(`Testing ${user}: `);
    const response = await fetch(base, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });
    console.log(`${response.status} ${response.statusText}`);
  } catch (e) {
    console.log(`Error: ${e.message}`);
  }
}

async function run() {
  for (const user of users) {
    await test(user);
  }
}

run();
