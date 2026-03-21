
async function discover() {
  const url = 'https://ville-ivry94.illico.city/AppBI/odata/';
  const username = 'User_StatBI';
  const password = '2V.}dyRB,8P9h6]8=Fte';
  const auth = Buffer.from(`${username}:${password}`).toString('base64');

  try {
    console.log('Fetching OData root...');
    const response = await fetch(url, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
       console.error('Failed to fetch root:', response.status, response.statusText);
       return;
    }

    const data = await response.json();
    const collections = (data.value || []).map(c => c.name);
    console.log('--- All OData Collections ---');
    console.log(collections);
    
    const custom = collections.filter(c => c.toLowerCase().includes('custom') || c.toLowerCase().includes('thesaurus'));
    console.log('--- Custom/Thesaurus Collections ---');
    console.log(custom);

    // Try to fetch ONE row from some of them
    for (const entity of custom) {
       try {
         const res = await fetch(`${url}${entity}?$top=1`, {
           headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
         });
         const json = await res.json();
         console.log(`[${entity}] Sample Content:`, json.value?.[0]);
       } catch (e) {
         console.log(`[${entity}] Error:`, e.message);
       }
    }

  } catch (err) {
    console.error('Discover Error:', err.message);
  }
}

discover();
