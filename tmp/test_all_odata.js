
async function testAll() {
  const url = 'https://ville-ivry94.illico.city/AppBI/odata/';
  const username = 'User_StatBI';
  const password = '2V.}dyRB,8P9h6]8=Fte';
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const rootRes = await fetch(url, { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } });
    const root = await rootRes.json();
    const entities = root.value.map(e => e.name);

    for (const entity of entities) {
       const res = await fetch(`${url}${entity}?$top=1`, {
         headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
       });
       console.log(`[${entity}] Status: ${res.status}`);
       if (res.ok) {
          const json = await res.json();
          console.log(`   Sample: OK (${json.value?.length || 0} items)`);
       }
    }
  } catch (err) {
    console.error(err);
  }
}

testAll();
