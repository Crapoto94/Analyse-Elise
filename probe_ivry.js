const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
const baseUrl = 'https://ville-ivry94.illico.city/AppBI/odata/';

async function run() {
  const headers = { 
    'Authorization': `Basic ${auth}`, 
    'Accept': 'application/json' 
  };

  console.log('--- DimMedium ---');
  try {
    const res = await fetch(baseUrl + 'DimMedium', { headers });
    const json = await res.json();
    console.log(JSON.stringify(json.value, null, 2));
  } catch (e) { console.error('DimMedium error:', e.message); }

  console.log('\n--- DimDocumentType (first 50) ---');
  try {
    const res = await fetch(baseUrl + 'DimDocumentType?$top=50', { headers });
    const json = await res.json();
    console.log(JSON.stringify(json.value.map(t => ({ Id: t.Id, Label: t.LabelFrFr || t.Label })), null, 2));
  } catch (e) { console.error('DimDocumentType error:', e.message); }
}

run();
