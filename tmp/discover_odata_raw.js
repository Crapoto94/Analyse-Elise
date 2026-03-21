
async function discover() {
  const url = 'https://ville-ivry94.illico.city/AppBI/odata/';
  const username = 'User_StatBI';
  const password = '2V.}dyRB,8P9h6]8=Fte';
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const custom = [
      'DimCustomValue',
      'DimCustomThesaurusTermValue',
      'DimCustomEnumValue',
      'DimCustomTextValue'
    ];

    for (const entity of custom) {
       try {
         console.log(`Checking ${entity}...`);
         const res = await fetch(`${url}${entity}?$top=5`, {
           headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
         });
         const text = await res.text();
         console.log(`[${entity}] Status: ${res.status}`);
         try {
            const json = JSON.parse(text);
            console.log(`[${entity}] data:`, JSON.stringify(json.value || json, null, 2).slice(0, 1000));
         } catch (e) {
            console.log(`[${entity}] RAW:`, text.slice(0, 500));
         }
       } catch (e) {
         console.log(`[${entity}] Fetch Error:`, e.message);
       }
    }

  } catch (err) {
    console.error('Discover Error:', err.message);
  }
}

discover();
