const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
const baseUrl = 'https://ville-ivry94.illico.city/AppBI/odata/';
const fs = require('fs');

async function run() {
  const headers = { 
    'Authorization': `Basic ${auth}`, 
    'Accept': 'application/json' 
  };

  const results = {};

  try {
    const res = await fetch(baseUrl, { headers });
    const json = await res.json();
    results.entities = json.value.map(e => e.name);
  } catch (e) { results.error = e.message; }

  fs.writeFileSync('odata_probe_results.json', JSON.stringify(results, null, 2));
}

run();
