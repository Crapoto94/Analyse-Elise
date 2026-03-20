const fs = require('fs');
const path = require('path');

async function test() {
  try {
    const env = fs.readFileSync('.env', 'utf8');
    const lines = env.split('\n');
    const find = (key) => {
      const line = lines.find(l => l.startsWith(key));
      if (!line) return null;
      let val = line.split('=')[1] || '';
      return val.replace(/"/g, '').replace(/'/g, '').trim();
    };
    
    const odataUrl = find('ODATA_URL');
    const odataUser = find('ODATA_USER');
    const odataPass = find('ODATA_PASS');
    
    if (!odataUrl || !odataUser) {
      console.error('Missing ODATA config in .env');
      return;
    }

    const auth = Buffer.from(`${odataUser}:${odataPass}`).toString('base64');
    
    console.log('--- ODATA PROBE ---');
    console.log('URL:', odataUrl);
    
    const res = await fetch(odataUrl, {
      headers: { 'Authorization': `Basic ${auth}`, 'Accept': 'application/json' }
    });
    
    if (!res.ok) {
       console.error('Request failed:', res.status, res.statusText);
       const text = await res.text();
       console.error('Response:', text.slice(0, 200));
       return;
    }

    const json = await res.json();
    const entities = (json.value || []).map(e => e.name);
    console.log('TOTAL ENTITIES:', entities.length);
    
    const interesting = [
      'Structure', 'Path', 'Hierarchy', 'Medium', 'Support', 'Vecteur', 'Type', 'State', 'Status'
    ];
    
    console.log('CANDIDATES:');
    for (const entity of entities) {
      if (interesting.some(i => entity.toLowerCase().includes(i.toLowerCase()))) {
        console.log(`- ${entity}`);
      }
    }

  } catch (e) {
    console.error('PROBE ERROR:', e.message);
  }
}
test();
