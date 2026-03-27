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
    const resM = await fetch(baseUrl + 'DimDocumentMedium', { headers });
    const jsonM = await resM.json();
    results.mediums = jsonM.value;

    const resT = await fetch(baseUrl + 'DimDocumentType', { headers });
    const jsonT = await resT.json();
    results.types = jsonT.value.map(t => ({ Id: t.Id, Label: t.LabelFrFr || t.Label }));
  } catch (e) { results.error = e.message; }

  fs.writeFileSync('odata_dims_results.json', JSON.stringify(results, null, 2));
}

run();
