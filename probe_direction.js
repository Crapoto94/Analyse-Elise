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
    const resD = await fetch(baseUrl + 'DimDocumentDirection', { headers });
    const jsonD = await resD.json();
    results.directions = jsonD.value;

    const filter = 'CreatedDate ge 2024-10-01T00:00:00Z and CreatedDate le 2024-10-31T23:59:59Z';
    const query = `FactDocument?$apply=filter(${filter})/groupby((DirectionId),aggregate($count as Count))`;
    const resA = await fetch(baseUrl + query, { headers });
    results.agg = await resA.json();

  } catch (e) { results.error = e.message; }

  fs.writeFileSync('odata_direction_results.json', JSON.stringify(results, null, 2));
}

run();
