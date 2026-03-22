const https = require('https');
const auth = Buffer.from('User_StatBI:2V.}dyRB,8P9h6]8=Fte').toString('base64');
const getOData = (url) => new Promise(resolve => {
  https.get(url, { headers: { 'Authorization': `Basic ${auth}` } }, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => { try { resolve(JSON.parse(raw)); } catch(e) { resolve({error: raw.substring(0,200)}); }});
  });
});

async function run() {
  console.log('--- Testing /api/hierarchy?year=2026 (Internal Simulation) ---');
  // On va directement appeler la fonction exportée plutôt que de passer par HTTP localhost (plus robuste ici)
  // Mais depuis un script externe, on appelle l'URL locale si l'app tourne.
  
  https.get('http://localhost:5002/api/hierarchy?year=2026', (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      try {
        const data = JSON.parse(raw);
        console.log('Pôles 2026 results:');
        data.poles.slice(0, 5).forEach(p => console.log(`  ${p.name}: ${p.count}`));
      } catch(e) { console.error('Parse error or App not ready:', e.message); }
    });
  }).on('error', (e) => console.error('Connection error:', e.message));
}
run();
