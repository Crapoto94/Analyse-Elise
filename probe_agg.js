const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
const baseUrl = 'https://ville-ivry94.illico.city/AppBI/odata/';
const fs = require('fs');

async function run() {
  const headers = { 
    'Authorization': `Basic ${auth}`, 
    'Accept': 'application/json' 
  };

  const query = 'FactDocument?$apply=filter(CreatedDate ge 2024-10-01T00:00:00Z and CreatedDate le 2024-10-31T23:59:59Z)/groupby((MediumId,StateId),aggregate($count as Count))';

  try {
    const res = await fetch(baseUrl + query, { headers });
    const json = await res.json();
    fs.writeFileSync('odata_agg_results.json', JSON.stringify(json, null, 2));
  } catch (e) { 
    fs.writeFileSync('odata_agg_results.json', JSON.stringify({ error: e.message }, null, 2));
  }
}

run();
