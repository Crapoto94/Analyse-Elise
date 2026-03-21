
async function inspectDoc() {
  const url = 'https://ville-ivry94.illico.city/AppBI/odata/FactDocument?$top=1';
  const username = 'User_StatBI';
  const password = '2V.}dyRB,8P9h6]8=Fte';
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    const res = await fetch(url, { headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' } });
    const json = await res.json();
    console.log('--- FactDocument Keys ---');
    console.log(Object.keys(json.value[0]));
    console.log('--- FactDocument Sample ---');
    console.log(json.value[0]);
  } catch (err) {
    console.error(err);
  }
}

inspectDoc();
